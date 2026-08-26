"use client";

import { useRef, useState } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { StorageBrowser } from "@/components/admin/StorageBrowser";

// Rich-text (HTML) editor backed by self-hosted TinyMCE 8 (GPL) served from
// /public/tinymce. Drag/paste image uploads and the "browse server" file picker
// both go through the CMS CDN — uploads POST to /api/admin/upload and the picker
// opens the shared StorageBrowser, so the News editor uses exactly the same
// media flow as the Gallery/Slider widgets.

type FilePickerCallback = (url: string, meta?: Record<string, unknown>) => void;

// TinyMCE image upload handler: POST the blob to /api/admin/upload (which returns
// { url }) and resolve with the public CDN URL.
function uploadHandler(blobInfo: { blob: () => Blob; filename: () => string }): Promise<string> {
  return new Promise((resolve, reject) => {
    const data = new FormData();
    data.append("file", blobInfo.blob(), blobInfo.filename());
    fetch("/api/admin/upload", { method: "POST", body: data })
      .then(async (res) => {
        const d = await res.json().catch(() => ({}));
        if (res.ok && d.url) resolve(d.url as string);
        else reject({ message: d.error || "Upload failed", remove: true });
      })
      .catch(() => reject({ message: "Upload failed (network).", remove: true }));
  });
}

export function RichText({
  value,
  onChange,
  height = 480,
}: {
  value: string;
  onChange: (html: string) => void;
  height?: number;
}) {
  const [browse, setBrowse] = useState(false);
  // The TinyMCE file-picker callback, held while the StorageBrowser is open.
  const pickerCb = useRef<FilePickerCallback | null>(null);

  return (
    <>
      <Editor
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        licenseKey="gpl"
        value={value}
        onEditorChange={(html) => onChange(html)}
        init={{
          height,
          menubar: "edit view insert format tools table",
          plugins:
            "advlist autolink lists link image charmap preview anchor " +
            "searchreplace visualblocks code fullscreen insertdatetime media table " +
            "help wordcount emoticons",
          toolbar:
            "undo redo | blocks | bold italic underline forecolor | " +
            "alignleft aligncenter alignright alignjustify | " +
            "bullist numlist outdent indent | link image media table | " +
            "removeformat code fullscreen help",
          branding: false,
          promotion: false,
          convert_urls: false,
          image_caption: true,
          image_advtab: true,
          automatic_uploads: true,
          images_upload_handler: uploadHandler,
          file_picker_types: "image media file",
          file_picker_callback: (callback: FilePickerCallback) => {
            // Defer selection to the shared StorageBrowser (CDN).
            pickerCb.current = callback;
            setBrowse(true);
          },
        }}
      />

      {/* Sits above TinyMCE's dialog layer (.tox-tinymce-aux is z-index ~1300):
          the relative + high z-index wrapper establishes a stacking context that
          wins over the editor's own dialogs when launched from "browse server". */}
      <div style={{ position: "relative", zIndex: 20000 }}>
        <StorageBrowser
          open={browse}
          filter="image"
          onClose={() => {
            pickerCb.current = null;
            setBrowse(false);
          }}
          onSelect={(url) => {
            pickerCb.current?.(url, { title: url.split("/").pop() ?? "" });
            pickerCb.current = null;
            setBrowse(false);
          }}
        />
      </div>
    </>
  );
}
