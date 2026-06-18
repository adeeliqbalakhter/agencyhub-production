"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Briefcase, ExternalLink } from "lucide-react";

interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  project_url?: string;
  client_name?: string;
  client_logo?: string;
  project_schedule?: string;
  project_size?: string;
  challenge?: string;
  approach?: string;
  results?: string;
  services_provided?: string;
}

export function PortfolioSection({ items }: { items: PortfolioItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const displayed = showAll ? items : items.slice(0, 6);
  const selected = selectedIndex !== null ? items[selectedIndex] : null;

  return (
    <>
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayed.map((item) => {
          const services = item.services_provided?.split(",").map(s => s.trim()).filter(Boolean) || [];
          return (
            <button
              key={item.id}
              onClick={() => setSelectedIndex(items.indexOf(item))}
              className="text-left bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-brand/30 transition-all group"
            >
              {item.image_url ? (
                <div className="h-44 overflow-hidden">
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              ) : (
                <div className="h-44 bg-gray-100 flex items-center justify-center">
                  <Briefcase className="w-10 h-10 text-gray-300" />
                </div>
              )}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{item.title}</h3>
                {services.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {services.slice(0, 2).map(s => (
                      <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                    {services.length > 2 && (
                      <span className="text-xs text-gray-400">+{services.length - 2} more</span>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {items.length > 6 && !showAll && (
        <div className="mt-6 text-center">
          <button onClick={() => setShowAll(true)} className="text-brand font-medium text-sm hover:underline">
            Show more ↓
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selected && selectedIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelectedIndex(null); }}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            {/* Close */}
            <button onClick={() => setSelectedIndex(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 md:p-8">
              {/* Title */}
              <h2 className="text-2xl font-bold text-navy pr-8">{selected.title}</h2>

              {/* Info bar */}
              <div className="mt-6 flex flex-wrap gap-6 border-y border-gray-100 py-4">
                {selected.client_name && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Client</p>
                    <p className="mt-1 font-semibold text-gray-900">{selected.client_name}</p>
                  </div>
                )}
                {selected.project_schedule && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Project Schedule</p>
                    <p className="mt-1 font-semibold text-gray-900">{selected.project_schedule}</p>
                  </div>
                )}
                {selected.project_size && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Project Size</p>
                    <p className="mt-1 font-semibold text-gray-900">{selected.project_size}</p>
                  </div>
                )}
              </div>

              {/* Services tags */}
              {selected.services_provided && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">Services provided on this Project</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.services_provided.split(",").map(s => s.trim()).filter(Boolean).map(s => (
                      <span key={s} className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full border border-gray-200">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Content with optional image */}
              <div className="mt-6 flex flex-col md:flex-row gap-8">
                <div className="flex-1 min-w-0">
                  {/* Challenge */}
                  {selected.challenge && (
                    <div className="mb-6">
                      <h3 className="font-bold text-navy text-lg">Challenge</h3>
                      <div className="mt-2 text-sm text-gray-600 leading-relaxed whitespace-pre-line">{selected.challenge}</div>
                    </div>
                  )}

                  {/* Approach */}
                  {selected.approach && (
                    <div className="mb-6">
                      <h3 className="font-bold text-navy text-lg">Our Approach</h3>
                      <div className="mt-2 text-sm text-gray-600 leading-relaxed whitespace-pre-line">{selected.approach}</div>
                    </div>
                  )}

                  {/* Results */}
                  {selected.results && (
                    <div className="mb-6">
                      <h3 className="font-bold text-navy text-lg">Results</h3>
                      <div className="mt-2 text-sm text-gray-600 leading-relaxed whitespace-pre-line">{selected.results}</div>
                    </div>
                  )}

                  {/* Description fallback for old items */}
                  {!selected.challenge && !selected.approach && selected.description && (
                    <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{selected.description}</div>
                  )}

                  {/* Project URL */}
                  {selected.project_url && (
                    <a href={selected.project_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-brand text-sm font-medium hover:underline mt-4">
                      <ExternalLink className="w-4 h-4" /> View Project
                    </a>
                  )}
                </div>

                {/* Image */}
                {(selected.image_url || selected.client_logo) && (
                  <div className="md:w-80 shrink-0">
                    {selected.image_url && (
                      <img src={selected.image_url} alt={selected.title} className="w-full rounded-xl" />
                    )}
                    {selected.client_logo && !selected.image_url && (
                      <img src={selected.client_logo} alt={selected.client_name || "Client"} className="w-full rounded-xl" />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Navigation footer */}
            {items.length > 1 && (
              <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-center gap-4">
                <button
                  onClick={() => setSelectedIndex((selectedIndex - 1 + items.length) % items.length)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-sm text-gray-500">
                  {selectedIndex + 1} of {items.length} Portfolio Items
                </span>
                <button
                  onClick={() => setSelectedIndex((selectedIndex + 1) % items.length)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
