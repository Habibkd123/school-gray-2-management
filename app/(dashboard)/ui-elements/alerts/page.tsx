"use client";

import React, { useState } from "react";
import { Alert } from "../../../components/ui/Alert";
import { Info, BellRing, CheckCircle, AlertTriangle, AlertOctagon, RotateCcw } from "lucide-react";

export default function AlertsPage() {
  const [showLiveAlert, setShowLiveAlert] = useState(false);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Alerts</h1>
        <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
          <span>Dashboard</span>
          <span>/</span>
          <span className="hover:text-primary cursor-pointer">UI Elements</span>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">Alerts</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          
          {/* Default Alert */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm p-6 text-left">
            <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 mb-2">Default Alert</h2>
            <p className="card-subtitle text-[13px] mb-6">
              For proper styling, use one of the eight <strong className="font-semibold text-slate-700 dark:text-slate-200">required</strong> contextual classes (e.g., <code className="text-rose-500 bg-rose-50 px-1 rounded">.alert-success</code>). For background color use class <code className="text-rose-500 bg-rose-50 px-1 rounded">.bg-*</code> , <code className="text-rose-500 bg-rose-50 px-1 rounded">.text-white</code>
            </p>
            
            <div className="space-y-3">
              <Alert variant="primary"><strong>Primary</strong> - A simple primary alert—check it out!</Alert>
              <Alert variant="secondary"><strong>Secondary</strong> - A simple secondary alert—check it out!</Alert>
              <Alert variant="success"><strong>Success</strong> - A simple success alert—check it out!</Alert>
              <Alert variant="danger"><strong>Danger</strong> - A simple danger alert—check it out!</Alert>
              <Alert variant="warning"><strong>Warning</strong> - A simple warning alert—check it out!</Alert>
              <Alert variant="info"><strong>Info</strong> - A simple info alert—check it out!</Alert>
              <Alert variant="light"><strong>Light</strong> - A simple light alert—check it out!</Alert>
              <Alert variant="dark"><strong>Dark</strong> - A simple dark alert—check it out!</Alert>
            </div>
          </div>

          {/* Link Color */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm p-6 text-left">
            <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 mb-2">Link Color</h2>
            <p className="card-subtitle text-[13px] mb-6">
              Use the <code className="text-rose-500 bg-rose-50 px-1 rounded">.alert-link</code> utility class to quickly provide matching colored links within any alert.
            </p>
            
            <div className="space-y-3">
              <Alert variant="primary">A simple primary alert with <a href="#" className="font-bold underline">an example link</a>. Give it a click if you like.</Alert>
              <Alert variant="secondary">A simple secondary alert with <a href="#" className="font-bold underline">an example link</a>. Give it a click if you like.</Alert>
              <Alert variant="success">A simple success alert with <a href="#" className="font-bold underline">an example link</a>. Give it a click if you like.</Alert>
              <Alert variant="danger">A simple danger alert with <a href="#" className="font-bold underline">an example link</a>. Give it a click if you like.</Alert>
              <Alert variant="warning">A simple warning alert with <a href="#" className="font-bold underline">an example link</a>. Give it a click if you like.</Alert>
              <Alert variant="info">A simple info alert with <a href="#" className="font-bold underline">an example link</a>. Give it a click if you like.</Alert>
              <Alert variant="light">A simple light alert with <a href="#" className="font-bold underline">an example link</a>. Give it a click if you like.</Alert>
              <Alert variant="dark">A simple dark alert with <a href="#" className="font-bold underline">an example link</a>. Give it a click if you like.</Alert>
            </div>
          </div>

          {/* Additional Content */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm p-6 text-left">
            <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 mb-2">Additional Content</h2>
            <p className="card-subtitle text-[13px] mb-6">
              Alerts can also contain additional HTML elements like headings, paragraphs and dividers.
            </p>

            <div className="space-y-4">
              <Alert variant="success" className="flex-col">
                <h4 className="text-[18px] font-bold mb-2">Well done!</h4>
                <p className="mb-4">
                  Aww yeah, you successfully read this important alert message. This example text is going to run a bit longer so that you can see how spacing within an alert works with this kind of content.
                </p>
                <hr className="border-emerald-200 mb-4" />
                <p className="mb-0">
                  Whenever you need to, be sure to use margin utilities to keep things nice and tidy.
                </p>
              </Alert>

              <Alert variant="info" icon={<CheckCircle className="w-8 h-8 opacity-70" />} className="items-start">
                <div>
                  <h4 className="text-[18px] font-bold mb-2">Well done!</h4>
                  <p className="mb-4">
                    Aww yeah, you successfully read this important alert message. This example text is going to run a bit longer so that you can see how spacing within an alert works with this kind of content.
                  </p>
                  <hr className="border-blue-200 mb-4" />
                  <p className="mb-0">
                    Whenever you need to, be sure to use margin utilities to keep things nice and tidy.
                  </p>
                </div>
              </Alert>

              <Alert variant="primary" icon={<CheckCircle className="w-8 h-8 opacity-70" />} className="items-center">
                <div className="flex-1">
                  <h4 className="text-[18px] font-bold mb-1">Thank you!</h4>
                  <p className="opacity-90">
                    Aww yeah, you successfully read this important alert message. This example text is going to run a bit longer so that you can see how spacing within an alert works with this kind of content.
                  </p>
                </div>
                <div className="shrink-0">
                  <button className="px-4 py-2 bg-[#3B82F6] text-white rounded-md text-[13px] font-semibold hover:bg-blue-600 transition-colors">
                    Close
                  </button>
                </div>
              </Alert>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          
          {/* Dismissing Alert */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm p-6 text-left">
            <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 mb-2">Dismissing Alert</h2>
            <p className="card-subtitle text-[13px] mb-6">
              Add a dismiss button and the <code className="text-rose-500 bg-rose-50 px-1 rounded">.alert-dismissible</code> class, which adds extra padding to the right of the alert and positions the <code className="text-rose-500 bg-rose-50 px-1 rounded">.btn-close</code> button.
            </p>
            
            <div className="space-y-3">
              <Alert type="solid" variant="primary" dismissible><strong>Primary</strong> - A simple primary alert — check it out!</Alert>
              <Alert type="solid" variant="secondary" dismissible><strong>Secondary</strong> - A simple secondary alert — check it out!</Alert>
              <Alert type="solid" variant="success" dismissible><strong>Success</strong> - A simple success alert — check it out!</Alert>
              <Alert type="solid" variant="danger" dismissible><strong>Error</strong> - A simple danger alert — check it out!</Alert>
              <Alert type="solid" variant="warning" dismissible><strong>Warning</strong> - A simple warning alert — check it out!</Alert>
              <Alert type="solid" variant="info" dismissible><strong>Info</strong> - A simple info alert — check it out!</Alert>
              <Alert type="solid" variant="light" dismissible><strong>Light</strong> - A simple light alert — check it out!</Alert>
              <Alert type="solid" variant="dark" dismissible><strong>Dark</strong> - A simple dark alert — check it out!</Alert>
            </div>
          </div>

          {/* Alerts With Border */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm p-6 text-left">
            <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 mb-2">Alerts With Border</h2>
            <p className="card-subtitle text-[13px] mb-6">
              Display alert with transparent background and with contextual text color. Use classes <code className="text-rose-500 bg-rose-50 px-1 rounded">.bg-white dark:bg-slate-900</code>, and <code className="text-rose-500 bg-rose-50 px-1 rounded">.text-*</code>. E.g. <code className="text-rose-500 bg-rose-50 px-1 rounded">bg-white dark:bg-slate-900 text-primary</code>.
            </p>
            
            <div className="space-y-3">
              <Alert type="bordered" variant="primary"><strong>Primary</strong> - A simple primary alert — check it out!</Alert>
              <Alert type="bordered" variant="secondary"><strong>Secondary</strong> - A simple secondary alert — check it out!</Alert>
              <Alert type="bordered" variant="success"><strong>Success</strong> - A simple success alert — check it out!</Alert>
              <Alert type="bordered" variant="danger"><strong>Error</strong> - A simple danger alert — check it out!</Alert>
              <Alert type="bordered" variant="warning"><strong>Warning</strong> - A simple warning alert — check it out!</Alert>
              <Alert type="bordered" variant="info"><strong>Info</strong> - A simple info alert — check it out!</Alert>
              <Alert type="bordered" variant="light"><strong>Light</strong> - A simple light alert — check it out!</Alert>
              <Alert type="bordered" variant="dark"><strong>Dark</strong> - A simple dark alert — check it out!</Alert>
            </div>
          </div>

          {/* Live Alert */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm p-6 text-left">
            <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 mb-2">Live Alert</h2>
            <p className="card-subtitle text-[13px] mb-6">
              Click the button below to show an alert (hidden with inline styles to start), then dismiss (and destroy) it with the built-in close button.
            </p>
            
            {showLiveAlert && (
              <div className="mb-4">
                <Alert type="default" variant="success" dismissible onDismiss={() => setShowLiveAlert(false)}>
                  Nice, you triggered this alert message!
                </Alert>
              </div>
            )}
            
            <button 
              onClick={() => setShowLiveAlert(true)}
              className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[13px] font-semibold rounded-lg transition-colors shadow-sm"
            >
              Show live alert
            </button>
          </div>

          {/* Alert With Icons */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm p-6 text-left">
            <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 mb-2">Alert With Icons</h2>
            
            <div className="space-y-3 mt-6">
              <Alert variant="primary" icon={<Info className="w-4 h-4" />}>An example alert with an icon</Alert>
              <Alert variant="secondary" icon={<BellRing className="w-4 h-4" />}>An example alert with an icon</Alert>
              <Alert variant="success" icon={<CheckCircle className="w-4 h-4" />}>An example alert with an icon</Alert>
              <Alert variant="danger" icon={<AlertOctagon className="w-4 h-4" />}>An example alert with an icon</Alert>
              <Alert variant="warning" icon={<AlertTriangle className="w-4 h-4" />}>An example alert with an icon</Alert>
              <Alert variant="info" icon={<Info className="w-4 h-4" />}>An example alert with an icon</Alert>
              <Alert variant="light" icon={<BellRing className="w-4 h-4" />}>An example alert with an icon</Alert>
              <Alert variant="dark" icon={<RotateCcw className="w-4 h-4" />}>An example alert with an icon</Alert>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
