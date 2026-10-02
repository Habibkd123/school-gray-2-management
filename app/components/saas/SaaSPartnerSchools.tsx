"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, ExternalLink, School, MapPin, Users, CheckCircle2, ShieldCheck } from "lucide-react";
import { PartnerSchoolItem } from "@/lib/landing/getPartnerSchools";

interface SaaSPartnerSchoolsProps {
  schools: PartnerSchoolItem[];
}

export function SaaSPartnerSchools({ schools }: SaaSPartnerSchoolsProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSchools = schools.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.subdomain.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q)
    );
  });

  return (
    <section id="schools" className="py-24 bg-[#090D16] border-t border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 text-xs font-semibold text-amber-300 bg-amber-500/10 rounded-full border border-amber-500/25 tracking-wide">
              <School className="w-3.5 h-3.5 text-amber-400" />
              <span>Verified Institution Network</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
              Partner Campuses &amp; Portals
            </h2>
            <p className="text-slate-400 mt-2.5 text-sm sm:text-base font-normal">
              Explore live school subdomains actively operating their daily academic routines on MySchoolLife.
            </p>
          </div>

          {/* Search Input Filter */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by school, city, or code..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
        </div>

        {/* Schools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchools.map((school) => {
            const portalUrl = school.subdomain ? `/?subdomain=${school.subdomain}` : "#";

            return (
              <div
                key={school.id}
                className="p-6 sm:p-7 rounded-3xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{school.status}</span>
                    </span>

                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 font-mono">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{school.studentsCount.includes("Students") ? school.studentsCount : `${school.studentsCount} Students`}</span>
                    </span>
                  </div>

                  <div className="flex items-start gap-3.5 mb-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-700/80 text-amber-400 flex items-center justify-center shrink-0 group-hover:border-amber-400/50 transition-colors">
                      <School className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors leading-snug">
                        {school.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{school.city}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs font-mono flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">Subdomain</span>
                    <span className="text-indigo-300 font-semibold">{school.subdomain}.myschoollife.in</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {school.features.map((f, fIdx) => (
                      <span
                        key={fIdx}
                        className="text-[11px] px-2.5 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800/80"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80">
                  <Link
                    href={portalUrl}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-700/80 hover:border-slate-500 transition-all flex items-center justify-center gap-2 group-hover:shadow-md"
                  >
                    <span>Launch School Portal</span>
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {filteredSchools.length === 0 && (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <School className="w-12 h-12 mx-auto text-slate-600 mb-2" />
            <p className="text-base font-semibold text-slate-300">
              No partner institutions found matching &quot;{searchQuery}&quot;
            </p>
            <p className="text-xs">
              Would you like to onboard your school? Contact our team for instant deployment.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
