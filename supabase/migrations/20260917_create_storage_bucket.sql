-- Création du bucket de stockage pour les médias de l'atelier
INSERT INTO storage.buckets (id, name, public) 
VALUES ('atelierpro-media', 'atelierpro-media', true)
ON CONFLICT (id) DO NOTHING;

-- Politique de lecture publique (car les URLs sont partagées)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'atelierpro-media' );

-- Politique d'insertion pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload media" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK ( bucket_id = 'atelierpro-media' );

-- Politique de mise à jour pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can update media"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'atelierpro-media' );

-- Politique de suppression pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can delete media"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'atelierpro-media' );
