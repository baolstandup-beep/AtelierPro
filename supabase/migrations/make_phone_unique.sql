-- Migration: Rendre le numéro de téléphone unique dans `profiles`
ALTER TABLE profiles ADD CONSTRAINT profiles_phone_key UNIQUE (phone);
