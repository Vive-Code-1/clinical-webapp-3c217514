import { useEffect, useRef, useState } from "react";
import { ImageIcon, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadClinicLogo } from "@/lib/utils/storage-uploads";
import { useAppTranslation } from "@/lib/i18n/app-translations";

export function useLogoPreview(logoStored: string | null) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!logoStored) {
        setLogoPreview(null);
        return;
      }
      if (/^https?:\/\//i.test(logoStored)) {
        setLogoPreview(logoStored);
        return;
      }
      const [bucket, ...rest] = logoStored.split("/");
      if (!bucket || rest.length === 0) return;
      const { data } = await supabase.storage.from(bucket).createSignedUrl(rest.join("/"), 60 * 60);
      if (!cancelled) setLogoPreview(data?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [logoStored]);
  return logoPreview;
}

export function LogoUploader({
  clinicId,
  logoStored,
  logoPreview,
  onChange,
}: {
  clinicId: string;
  logoStored: string | null;
  logoPreview: string | null;
  onChange: (path: string | null) => void;
}) {
  const { t } = useAppTranslation();
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handlePick = async (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) {
      toast.error(t("app.settings.imageOnly"));
      return;
    }
    setUploading(true);
    try {
      const path = await uploadClinicLogo(clinicId, file);
      onChange(path);
      toast.success(t("app.settings.saved"));
    } catch (e: any) {
      toast.error(e?.message ?? t("app.settings.uploadError"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
        <ImageIcon className="w-3.5 h-3.5" /> {t("app.settings.logo")}
      </label>
      <div className="mt-2 flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl border border-border bg-muted/30 grid place-items-center overflow-hidden">
          {logoPreview ? (
            <img src={logoPreview} alt="" className="w-full h-full object-contain" />
          ) : (
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handlePick(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          {uploading
            ? t("app.settings.uploading")
            : logoStored
              ? t("app.settings.replaceLogo")
              : t("app.settings.uploadLogo")}
        </button>
        {logoStored && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium text-destructive"
          >
            <Trash2 className="w-4 h-4" /> {t("app.settings.removeLogo")}
          </button>
        )}
      </div>
    </div>
  );
}
