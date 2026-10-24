from pathlib import Path
from types import SimpleNamespace
import tempfile
from uuid import uuid4

import cv2
import numpy as np
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.config import settings
from app.database import SessionLocal
from app.main import app
from app.models.authority import CivicAuthority
from app.models.pothole import Pothole
from app.services.detection_service import detection_service


def test_system():
    with TestClient(app) as client:
        res = client.get("/")
        assert res.status_code == 200
        print("[PASS] Root healthcheck:", res.json()["system"])

        res = client.get("/api/authorities")
        assert res.status_code == 200
        authorities = res.json()
        assert len(authorities) > 0
        print(f"[PASS] Authorities fetched: {len(authorities)} bodies registered.")

        res = client.get("/api/potholes")
        assert res.status_code == 200
        potholes = res.json()
        assert isinstance(potholes, list)
        print(f"[PASS] Potholes list: {len(potholes)} records found.")

        res = client.get("/api/potholes/stats/summary")
        assert res.status_code == 200
        stats = res.json()
        print(
            f"[PASS] Stats summary: {stats['total_potholes']} total, "
            f"Resolution rate: {stats['resolution_rate_percent']}%"
        )

        res = client.get("/api/config/status")
        assert res.status_code == 200
        config = res.json()
        assert config["database_url_masked"].endswith("://***")
        assert "upload_directory" not in config
        print("[PASS] Configuration status masks database credentials and host paths.")

        if potholes:
            sample_ticket = potholes[0]["ticket_code"]
            res = client.get(f"/api/tickets/{sample_ticket}/download-pdf")
            assert res.status_code == 200
            assert res.headers["content-type"] == "application/pdf"
            print(f"[PASS] PDF Incident Report generated ({len(res.content)} bytes).")
        else:
            print("[SKIP] PDF report requires at least one reported pothole.")

        res = client.post(
            "/api/authorities/lookup?lat=28.5398&lng=77.1232&road_type=NATIONAL_HIGHWAY"
        )
        assert res.status_code == 200
        lookup = res.json()
        assert lookup["authority"] is not None
        print(f"[PASS] GPS Geo-routing: mapped to {lookup['authority']['name']}")


def test_blank_image_does_not_create_a_report():
    success, encoded_image = cv2.imencode(
        ".jpg", np.zeros((100, 100, 3), dtype=np.uint8)
    )
    assert success

    result = None
    try:
        with TestClient(app) as client:
            res = client.post(
                "/api/detect/image",
                files={"file": ("blank.jpg", encoded_image.tobytes(), "image/jpeg")},
                data={
                    "latitude": "28.6139",
                    "longitude": "77.2090",
                    "auto_report": "true",
                },
            )
            assert res.status_code == 200, res.text
            result = res.json()
            assert result["pothole_count"] == 0
            assert result["highest_severity"] == "NONE"
            assert result["pothole_record"] is None
            print("[PASS] Blank image did not create a pothole report.")
    finally:
        if result:
            for url_key in ("original_image_url", "annotated_image_url"):
                stored_file = Path(settings.UPLOAD_DIR) / Path(result[url_key]).name
                if stored_file.exists():
                    stored_file.unlink()


def test_successful_empty_model_result_does_not_use_cv_fallback():
    success, encoded_image = cv2.imencode(
        ".jpg", np.zeros((100, 100, 3), dtype=np.uint8)
    )
    assert success
    original_model = detection_service.model
    stored_urls = ()

    class EmptyModel:
        def __call__(self, *_args, **_kwargs):
            return [SimpleNamespace(boxes=[], names={})]

    try:
        detection_service.model = EmptyModel()
        with patch.object(
            detection_service,
            "detect_potholes_cv",
            side_effect=AssertionError("CV fallback should not run after valid inference"),
        ):
            detections, original_url, annotated_url = detection_service.detect_potholes(
                encoded_image.tobytes()
            )
            stored_urls = (original_url, annotated_url)
        assert detections == []
        print("[PASS] A successful no-detection model result does not trigger CV false positives.")
    finally:
        detection_service.model = original_model
        for url in stored_urls:
            stored_file = Path(settings.UPLOAD_DIR) / Path(url).name
            if stored_file.exists():
                stored_file.unlink()


def test_pdf_report_endpoint():
    with TestClient(app) as client:
        with SessionLocal() as db:
            authority = db.query(CivicAuthority).first()
            assert authority is not None
            pothole = Pothole(
                ticket_code=f"TEST-{uuid4().hex}",
                latitude=28.6139,
                longitude=77.2090,
                image_url="/uploads/test-evidence.jpg",
                authority_id=authority.id,
            )
            db.add(pothole)
            db.commit()
            ticket_code = pothole.ticket_code
            pothole_id = pothole.id

        try:
            res = client.get(f"/api/tickets/{ticket_code}/download-pdf")
            assert res.status_code == 200
            assert res.headers["content-type"] == "application/pdf"
            assert res.content.startswith(b"%PDF")
            print(f"[PASS] PDF Incident Report generated ({len(res.content)} bytes).")
        finally:
            with SessionLocal() as db:
                test_record = db.query(Pothole).filter(
                    Pothole.id == pothole_id
                ).first()
                if test_record:
                    db.delete(test_record)
                    db.commit()


def test_image_report_lifecycle_and_pdf():
    image = np.full((480, 640, 3), 51, dtype=np.uint8)
    cv2.ellipse(image, (320, 310), (95, 55), 0, 0, 360, (20, 20, 20), -1)
    success, encoded_image = cv2.imencode(".jpg", image)
    assert success

    result = None
    with TestClient(app) as client:
        with patch(
            "app.routes.detection_routes.authority_service.reverse_geocode",
            return_value={
                "address": "Test road",
                "city": "Delhi",
                "road_name": "Test road",
                "zone": "Test zone",
                "road_type": "URBAN_ROAD",
            },
        ):
            res = client.post(
                "/api/detect/image",
                files={"file": ("pothole.jpg", encoded_image.tobytes(), "image/jpeg")},
                data={
                    "latitude": "28.55",
                    "longitude": "77.23",
                    "road_type": "URBAN_ROAD",
                    "auto_report": "true",
                },
            )
        assert res.status_code == 200, res.text
        result = res.json()
        assert result["pothole_count"] > 0
        assert result["pothole_record"] is not None
        pothole_id = result["pothole_record"]["id"]
        ticket_code = result["pothole_record"]["ticket_code"]
        for url_key in ("original_image_url", "annotated_image_url"):
            media_res = client.get(result[url_key])
            assert media_res.status_code == 200
            assert media_res.headers["content-type"].startswith("image/")

        res = client.get(f"/api/tickets/{ticket_code}/download-pdf")
        assert res.status_code == 200
        assert res.content.startswith(b"%PDF")

        res = client.patch(
            f"/api/potholes/{pothole_id}/status",
            json={"status": "ACKNOWLEDGED", "changed_by": "Test"},
        )
        assert res.status_code == 200
        assert res.json()["status"] == "ACKNOWLEDGED"
        res = client.get(f"/api/potholes/{pothole_id}/status-history")
        assert res.status_code == 200
        assert [entry["to_status"] for entry in res.json()] == [
            "REPORTED",
            "ACKNOWLEDGED",
        ]

        res = client.delete(f"/api/potholes/{pothole_id}")
        assert res.status_code == 200
        print("[PASS] Image upload, report creation, status update, and cleanup.")
        print("[PASS] PDF generated for the detected report.")

    for url_key in ("original_image_url", "annotated_image_url"):
        stored_file = Path(settings.UPLOAD_DIR) / Path(result[url_key]).name
        if stored_file.exists():
            stored_file.unlink()


def test_video_validation_and_processing():
    source_image = Path(settings.UPLOAD_DIR).parent / "Frontend" / "public" / "images" / "new-delhi-broken-roads.jpg"
    image = cv2.imread(str(source_image))
    assert image is not None, f"Sample image not found or unreadable: {source_image}"
    image = cv2.resize(image, (640, 480))

    video_path = None
    generated_media_urls = []
    try:
        with tempfile.NamedTemporaryFile(
            suffix=".mp4", dir=settings.UPLOAD_DIR, delete=False
        ) as temp_video:
            video_path = temp_video.name

        writer = cv2.VideoWriter(
            video_path, cv2.VideoWriter_fourcc(*"mp4v"), 10, (640, 480)
        )
        assert writer.isOpened(), "OpenCV could not initialize the MP4 writer"
        for _ in range(8):
            writer.write(image)
        writer.release()

        video_bytes = Path(video_path).read_bytes()
        with TestClient(app) as client:
            image_result = client.post(
                "/api/detect/image",
                files={
                    "file": (
                        "new-delhi-broken-roads.jpg",
                        source_image.read_bytes(),
                        "image/jpeg",
                    )
                },
                data={"auto_report": "false", "reported_by": "Image pipeline test"},
            )
            assert image_result.status_code == 200, image_result.text
            image_summary = image_result.json()
            assert image_summary["pothole_count"] > 0
            assert image_summary["pothole_record"] is None
            generated_media_urls.extend(
                [
                    image_summary["original_image_url"],
                    image_summary["annotated_image_url"],
                ]
            )
            print(
                "[PASS] Public New Delhi pothole image analyzed: "
                f"{image_summary['pothole_count']} detections, no report created."
            )

            invalid_interval = client.post(
                "/api/detect/video",
                files={"file": ("sample.mp4", video_bytes, "video/mp4")},
                data={"frame_interval": "0"},
            )
            assert invalid_interval.status_code == 422, invalid_interval.text

            invalid_video = client.post(
                "/api/detect/video",
                files={"file": ("invalid.mp4", b"not a video", "video/mp4")},
            )
            assert invalid_video.status_code == 400, invalid_video.text

            result = client.post(
                "/api/detect/video",
                files={"file": ("sample.mp4", video_bytes, "video/mp4")},
                data={"frame_interval": "2"},
            )
            assert result.status_code == 200, result.text
            summary = result.json()
            assert summary["total_frames_analyzed"] == 4
            assert summary["pothole_detections_count"] >= len(summary["detections"])
            assert summary["video_source_url"]
            assert summary["suggested_authority"] is not None
            generated_media_urls.append(summary["video_source_url"])
            generated_media_urls.extend(summary["keyframes"])

            media = client.get(summary["video_source_url"])
            assert media.status_code == 200
            assert media.content == video_bytes
            for keyframe_url in summary["keyframes"]:
                keyframe = client.get(keyframe_url)
                assert keyframe.status_code == 200
                assert keyframe.headers["content-type"].startswith("image/")

            video_file = Path(settings.UPLOAD_DIR) / Path(
                summary["video_source_url"]
            ).name
            if video_file.exists():
                video_file.unlink()

            print(
                "[PASS] Video upload, interval validation, sampled frame processing, "
                f"and keyframe serving ({summary['pothole_detections_count']} detections)."
            )
    finally:
        if video_path and Path(video_path).exists():
            Path(video_path).unlink()
        for url in generated_media_urls:
            if url.startswith("/uploads/"):
                stored_file = Path(settings.UPLOAD_DIR) / Path(url).name
                if stored_file.exists():
                    stored_file.unlink()


if __name__ == "__main__":
    test_system()
    test_blank_image_does_not_create_a_report()
    test_successful_empty_model_result_does_not_use_cv_fallback()
    test_pdf_report_endpoint()
    test_image_report_lifecycle_and_pdf()
    test_video_validation_and_processing()
