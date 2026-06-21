
CREATE POLICY "auth read brand-assets" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'brand-assets');
CREATE POLICY "auth insert brand-assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'brand-assets');
CREATE POLICY "auth update brand-assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'brand-assets');
CREATE POLICY "auth delete brand-assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'brand-assets');
