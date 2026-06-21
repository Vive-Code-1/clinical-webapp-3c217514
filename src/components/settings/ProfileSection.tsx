import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { User as UserIcon, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { uploadUserAvatar } from "@/lib/utils/storage-uploads";
import { myProfileQuery } from "@/lib/queries/me";
import { useAppTranslation } from "@/lib/i18n/app-translations";

export function ProfileSection({ userId }: { userId: string }) {
  const { t } = useAppTranslation();
  const qc = useQueryClient();
  const profile = useQuery(myProfileQuery(userId));
  const avatarInput = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarPick = async (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) {
      toast.error(t("app.settings.imageOnly"));
      return;
    }
    setUploadingAvatar(true);
    try {
      const path = await uploadUserAvatar(userId, file);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", userId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["my-profile", userId] });
      toast.success(t("app.settings.saved"));
    } catch (e: any) {
      toast.error(e?.message ?? t("app.settings.uploadError"));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const initials =
    (profile.data?.full_name ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

  return (
    <section className="rounded-2xl border border-border bg-card card-pop p-5 space-y-4">
      <header className="flex items-center gap-2">
        <UserIcon className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{t("app.settings.profile")}</h2>
      </header>
      <p className="text-sm text-muted-foreground">{t("app.settings.profileHelp")}</p>
      <div className="flex items-center gap-4">
        <Avatar className="w-16 h-16">
          {profile.data?.avatar_src && (
            <AvatarImage src={profile.data.avatar_src} alt={profile.data.full_name ?? ""} />
          )}
          <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-2">
          <input
            ref={avatarInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleAvatarPick(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => avatarInput.current?.click()}
            disabled={uploadingAvatar}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {uploadingAvatar
              ? t("app.settings.uploading")
              : profile.data?.avatar_src
                ? t("app.settings.replaceAvatar")
                : t("app.settings.uploadAvatar")}
          </button>
        </div>
      </div>
    </section>
  );
}
