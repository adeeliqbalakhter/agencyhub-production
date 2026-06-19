"use client";

import { useState } from "react";
import { UploadButton } from "@/lib/uploadthing";
import { X, Loader2, ImageIcon } from "lucide-react";
import Image from "next/image";
import type { UploadEndpoint } from "@/lib/uploadthing";

interface FileUploadProps {
  endpoint: UploadEndpoint;
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  label?: string;
  description?: string;
}

export function FileUpload({
  endpoint,
  value,
  onChange,
  onRemove,
  label = "Upload Image",
  description = "Click to upload",
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  if (value) {
    return (
      <div className="relative w-fit">
        <div className="relative w-32 h-32 rounded-lg border border-gray-200 overflow-hidden">
          <Image src={value} alt="Uploaded" fill className="object-cover" />
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-sm"
            type="button"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-gray-700">{label}</p>}
      <UploadButton
        endpoint={endpoint}
        onUploadBegin={() => setIsUploading(true)}
        onClientUploadComplete={(res) => {
          setIsUploading(false);
          if (res?.[0]?.url) onChange(res[0].url);
        }}
        onUploadError={(error: Error) => {
          setIsUploading(false);
          if (process.env.NODE_ENV !== "production") console.error("Upload error:", error);
          alert(`Upload failed: ${error.message}`);
        }}
        appearance={{
          button: { background: "#2563eb", color: "#fff", padding: "10px 20px", borderRadius: "8px", fontSize: "14px", fontWeight: 500 },
        }}
        content={{
          button({ ready }) {
            if (!ready) return <Loader2 className="w-4 h-4 animate-spin" />;
            return <span className="flex items-center gap-2"><ImageIcon className="w-4 h-4" />{isUploading ? "Uploading..." : label}</span>;
          },
          allowedContent: description,
        }}
      />
    </div>
  );
}

interface MultiFileUploadProps {
  endpoint: UploadEndpoint;
  values: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  maxFiles?: number;
}

export function MultiFileUpload({ endpoint, values, onChange, label = "Upload Images", maxFiles = 5 }: MultiFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const removeFile = (index: number) => { const n = [...values]; n.splice(index, 1); onChange(n); };
  const remaining = maxFiles - values.length;

  return (
    <div className="space-y-3">
      {label && <p className="text-sm font-medium text-gray-700">{label}</p>}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {values.map((url, i) => (
            <div key={url} className="relative w-24 h-24 rounded-lg border border-gray-200 overflow-hidden group">
              <Image src={url} alt={`Upload ${i + 1}`} fill className="object-cover" />
              <button onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" type="button"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}
      {remaining > 0 && (
        <UploadButton
          endpoint={endpoint}
          onUploadBegin={() => setIsUploading(true)}
          onClientUploadComplete={(res) => { setIsUploading(false); const urls = res?.map((f) => f.url) ?? []; onChange([...values, ...urls]); }}
          onUploadError={(error: Error) => { setIsUploading(false); if (process.env.NODE_ENV !== "production") console.error("Upload error:", error); alert(`Upload failed: ${error.message}`); }}
          appearance={{ button: { background: "#f3f4f6", color: "#374151", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", border: "1px dashed #d1d5db" } }}
          content={{ button({ ready }) { if (!ready) return <Loader2 className="w-4 h-4 animate-spin" />; return isUploading ? "Uploading..." : `+ Add Image (${remaining} left)`; }, allowedContent: `Max ${maxFiles} images, 8MB each` }}
        />
      )}
    </div>
  );
}
