import React from 'react';
import { AlertCircle, ExternalLink, MapPin } from 'lucide-react';
import potholeReferences from '../data/potholeReferences';

export default function PotholeReferences() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8 rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-900/70 p-6">
        <div className="mb-2 flex items-center gap-2 text-sky-400">
          <MapPin className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Public image references</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white">Road pothole references</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Openly licensed photographs with source locations and recorded local model analyses.
          Location details are shown only as specifically as each source supports.
        </p>
        <p className="mt-3 flex items-start gap-2 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          These are externally published photographs, not current condition checks or reports filed
          with civic authorities by this application. Results below are recorded model predictions
          from 24 October 2026, not verified ground truth; no public ticket was submitted.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {potholeReferences.map((reference) => (
            <article
              key={reference.id}
              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg"
            >
              <img
                src={reference.image}
                alt={`Public pothole photograph: ${reference.title}`}
                className="h-56 w-full bg-slate-950 object-cover"
              />
              <div className="space-y-4 p-5">
                <div>
                  <h2 className="font-bold text-white">{reference.title}</h2>
                  <p className="mt-1 text-sm text-slate-300">{reference.place}</p>
                  <p className="mt-1 text-xs text-slate-500">Country: {reference.country}</p>
                  {reference.latitude !== undefined && reference.longitude !== undefined && (
                    <p className="mt-2 font-mono text-xs text-slate-500">
                      {reference.latitude}, {reference.longitude}
                    </p>
                  )}
                </div>

                <p className="text-sm text-slate-400">{reference.description}</p>

                <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
                  <p className="font-semibold text-white">
                    Recorded model analysis: {reference.detections.length} detections
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Analyzed {reference.analysisDate} - local model predictions, not independently verified.
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-300">
                    {reference.detections.map((detection, index) => (
                      <li key={`${reference.id}-${index}`}>
                        {detection.severity} - {Math.round(detection.confidence * 100)}% model confidence
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3 text-xs text-slate-400">
                  <span>
                    {reference.creator} - {reference.license}
                  </span>
                  <a
                    href={reference.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200"
                  >
                    Source and license <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href={reference.licenseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="basis-full text-slate-500 hover:text-slate-300"
                  >
                    License terms: {reference.license}
                  </a>
                </div>
              </div>
            </article>
        ))}
      </div>
    </section>
  );
}
