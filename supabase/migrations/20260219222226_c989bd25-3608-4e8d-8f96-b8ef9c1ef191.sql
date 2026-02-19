
-- 1. Remplir les lettres arabes (28 lettres)
INSERT INTO public.alphabet_letters (letter_arabic, name_french, name_arabic, position_isolated, position_initial, position_medial, position_final)
VALUES
  ('ا', 'Alif', 'أَلِف', 'ا', 'ا', 'ـا', 'ـا'),
  ('ب', 'Ba', 'بَاء', 'ب', 'بـ', 'ـبـ', 'ـب'),
  ('ت', 'Ta', 'تَاء', 'ت', 'تـ', 'ـتـ', 'ـت'),
  ('ث', 'Tha', 'ثَاء', 'ث', 'ثـ', 'ـثـ', 'ـث'),
  ('ج', 'Jim', 'جِيم', 'ج', 'جـ', 'ـجـ', 'ـج'),
  ('ح', 'Ha', 'حَاء', 'ح', 'حـ', 'ـحـ', 'ـح'),
  ('خ', 'Kha', 'خَاء', 'خ', 'خـ', 'ـخـ', 'ـخ'),
  ('د', 'Dal', 'دَال', 'د', 'د', 'ـد', 'ـد'),
  ('ذ', 'Dhal', 'ذَال', 'ذ', 'ذ', 'ـذ', 'ـذ'),
  ('ر', 'Ra', 'رَاء', 'ر', 'ر', 'ـر', 'ـر'),
  ('ز', 'Zay', 'زَاي', 'ز', 'ز', 'ـز', 'ـز'),
  ('س', 'Sin', 'سِين', 'س', 'سـ', 'ـسـ', 'ـس'),
  ('ش', 'Shin', 'شِين', 'ش', 'شـ', 'ـشـ', 'ـش'),
  ('ص', 'Sad', 'صَاد', 'ص', 'صـ', 'ـصـ', 'ـص'),
  ('ض', 'Dad', 'ضَاد', 'ض', 'ضـ', 'ـضـ', 'ـض'),
  ('ط', 'Ta (emphatique)', 'طَاء', 'ط', 'طـ', 'ـطـ', 'ـط'),
  ('ظ', 'Dha (emphatique)', 'ظَاء', 'ظ', 'ظـ', 'ـظـ', 'ـظ'),
  ('ع', 'Ayn', 'عَيْن', 'ع', 'عـ', 'ـعـ', 'ـع'),
  ('غ', 'Ghayn', 'غَيْن', 'غ', 'غـ', 'ـغـ', 'ـغ'),
  ('ف', 'Fa', 'فَاء', 'ف', 'فـ', 'ـفـ', 'ـف'),
  ('ق', 'Qaf', 'قَاف', 'ق', 'قـ', 'ـقـ', 'ـق'),
  ('ك', 'Kaf', 'كَاف', 'ك', 'كـ', 'ـكـ', 'ـك'),
  ('ل', 'Lam', 'لَام', 'ل', 'لـ', 'ـلـ', 'ـل'),
  ('م', 'Mim', 'مِيم', 'م', 'مـ', 'ـمـ', 'ـم'),
  ('ن', 'Nun', 'نُون', 'ن', 'نـ', 'ـنـ', 'ـن'),
  ('ه', 'Ha (souffle)', 'هَاء', 'ه', 'هـ', 'ـهـ', 'ـه'),
  ('و', 'Waw', 'وَاو', 'و', 'و', 'ـو', 'ـو'),
  ('ي', 'Ya', 'يَاء', 'ي', 'يـ', 'ـيـ', 'ـي')
ON CONFLICT DO NOTHING;

-- 2. Table pour les 99 Noms d'Allah avec explication
CREATE TABLE IF NOT EXISTS public.allah_names (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name_arabic text NOT NULL,
  name_french text NOT NULL,
  transliteration text,
  explanation text,
  display_order integer NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.allah_names ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read allah names" ON public.allah_names FOR SELECT USING (true);
CREATE POLICY "Admins can manage allah names" ON public.allah_names FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Table pour les modules génériques (cartes des modules dynamiques)
CREATE TABLE IF NOT EXISTS public.module_cards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid NOT NULL,
  title text NOT NULL,
  title_arabic text,
  description text,
  image_url text,
  display_order integer NOT NULL DEFAULT 0,
  section text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.module_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read module cards" ON public.module_cards FOR SELECT USING (true);
CREATE POLICY "Admins can manage module cards" ON public.module_cards FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Table pour le contenu des cartes de modules
CREATE TABLE IF NOT EXISTS public.module_card_content (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES public.module_cards(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.module_card_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read module card content" ON public.module_card_content FOR SELECT USING (true);
CREATE POLICY "Admins can manage module card content" ON public.module_card_content FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Insérer les 99 Noms d'Allah
INSERT INTO public.allah_names (name_arabic, name_french, transliteration, explanation, display_order) VALUES
('الرَّحْمَنُ', 'Le Très Miséricordieux', 'Ar-Rahmân', 'Celui dont la miséricorde englobe toutes les créatures en ce monde.', 1),
('الرَّحِيمُ', 'Le Très Compatissant', 'Ar-Rahîm', 'Celui dont la miséricorde particulière est réservée aux croyants dans l''au-delà.', 2),
('المَلِكُ', 'Le Roi Absolu', 'Al-Malik', 'Le Souverain absolu de toute chose.', 3),
('القُدُّوسُ', 'Le Très Saint', 'Al-Quddûs', 'Celui qui est exempt de toute imperfection.', 4),
('السَّلَامُ', 'La Source de Paix', 'As-Salâm', 'Celui dont la paix est parfaite et absolue.', 5),
('المُؤْمِنُ', 'Celui qui donne la sécurité', 'Al-Mu''min', 'Celui qui accorde la sécurité et la foi.', 6),
('المُهَيْمِنُ', 'Le Gardien suprême', 'Al-Muhaimin', 'Celui qui surveille et protège tout.', 7),
('العَزِيزُ', 'Le Tout-Puissant', 'Al-''Azîz', 'Celui dont la puissance est absolue et incomparable.', 8),
('الجَبَّارُ', 'Le Contraignant', 'Al-Jabbâr', 'Celui qui répare les cœurs brisés.', 9),
('المُتَكَبِّرُ', 'Le Très Grand', 'Al-Mutakabbir', 'Celui qui possède la grandeur absolue.', 10),
('الخَالِقُ', 'Le Créateur', 'Al-Khâliq', 'Celui qui crée à partir de rien.', 11),
('البَارِئُ', 'Le Créateur de l''harmonie', 'Al-Bâri''', 'Celui qui crée les êtres dans leur harmonie parfaite.', 12),
('المُصَوِّرُ', 'Le Façonneur des formes', 'Al-Musawwir', 'Celui qui donne leur forme à Ses créatures.', 13),
('الغَفَّارُ', 'Le Grand Pardonneur', 'Al-Ghaffâr', 'Celui qui pardonne abondamment les péchés.', 14),
('القَهَّارُ', 'Le Dominateur absolu', 'Al-Qahhâr', 'Celui qui domine tout sans partage.', 15),
('الوَهَّابُ', 'Le Dispensateur de dons', 'Al-Wahhâb', 'Celui qui accorde Ses dons sans compter.', 16),
('الرَّزَّاقُ', 'Le Pourvoyeur de subsistance', 'Ar-Razzâq', 'Celui qui pourvoit à tous les besoins.', 17),
('الفَتَّاحُ', 'Le Grand Ouvreur', 'Al-Fattâh', 'Celui qui ouvre les portes de la miséricorde.', 18),
('العَلِيمُ', 'L''Omniscient', 'Al-''Alîm', 'Celui dont la connaissance est infinie.', 19),
('القَابِضُ', 'Celui qui resserre', 'Al-Qâbid', 'Celui qui retient et resserre selon Sa sagesse.', 20),
('البَاسِطُ', 'Celui qui étend', 'Al-Bâsit', 'Celui qui étend et élargit Ses bienfaits.', 21),
('الخَافِضُ', 'Celui qui abaisse', 'Al-Khâfid', 'Celui qui humilie les orgueilleux.', 22),
('الرَّافِعُ', 'Celui qui élève', 'Ar-Râfi''', 'Celui qui élève les humbles et les pieux.', 23),
('المُعِزُّ', 'Celui qui honore', 'Al-Mu''izz', 'Celui qui accorde l''honneur et la dignité.', 24),
('المُذِلُّ', 'Celui qui humilie', 'Al-Mudhill', 'Celui qui humilie selon Sa sagesse.', 25),
('السَّمِيعُ', 'L''Omniscient (par l''ouïe)', 'As-Samî''', 'Celui qui entend tout sans exception.', 26),
('البَصِيرُ', 'Le Clairvoyant', 'Al-Basîr', 'Celui qui voit tout dans les moindres détails.', 27),
('الحَكَمُ', 'Le Juge suprême', 'Al-Hakam', 'Celui dont le jugement est définitif et parfait.', 28),
('العَدْلُ', 'Le Juste', 'Al-''Adl', 'Celui dont la justice est parfaite.', 29),
('اللَّطِيفُ', 'Le Subtil', 'Al-Latîf', 'Celui qui est bienveillant et subtil.', 30),
('الخَبِيرُ', 'L''Expert', 'Al-Khabîr', 'Celui qui connaît tous les secrets.', 31),
('الحَلِيمُ', 'Le Très Doux', 'Al-Halîm', 'Celui qui ne Se hâte pas de punir.', 32),
('العَظِيمُ', 'Le Très Grand', 'Al-''Azîm', 'Celui dont la grandeur est infinie.', 33),
('الغَفُورُ', 'Le Pardonneur', 'Al-Ghafûr', 'Celui qui pardonne et recouvre les péchés.', 34),
('الشَّكُورُ', 'Le Très Reconnaissant', 'Ash-Shakûr', 'Celui qui récompense généreusement.', 35),
('العَلِيُّ', 'Le Très Haut', 'Al-''Alî', 'Celui qui est au-dessus de toute chose.', 36),
('الكَبِيرُ', 'Le Très Grand', 'Al-Kabîr', 'Celui dont la grandeur dépasse toute compréhension.', 37),
('الحَفِيظُ', 'Le Gardien', 'Al-Hafîz', 'Celui qui préserve tout dans Sa garde.', 38),
('المُقِيتُ', 'Le Dispensateur de nourriture', 'Al-Muqît', 'Celui qui nourrit et soutient toute créature.', 39),
('الحَسِيبُ', 'Le Comptable suprême', 'Al-Hasîb', 'Celui qui tient compte de tout.', 40),
('الجَلِيلُ', 'Le Majestueux', 'Al-Jalîl', 'Celui dont la majesté est incomparable.', 41),
('الكَرِيمُ', 'Le Très Généreux', 'Al-Karîm', 'Celui dont la générosité est sans limites.', 42),
('الرَّقِيبُ', 'Le Vigilant', 'Ar-Raqîb', 'Celui qui surveille tout en permanence.', 43),
('المُجِيبُ', 'Celui qui répond', 'Al-Mujîb', 'Celui qui répond aux prières.', 44),
('الوَاسِعُ', 'Le Vaste', 'Al-Wâsi''', 'Celui dont la miséricorde est immense.', 45),
('الحَكِيمُ', 'Le Sage', 'Al-Hakîm', 'Celui dont la sagesse est parfaite.', 46),
('الوَدُودُ', 'L''Affectueux', 'Al-Wadûd', 'Celui qui aime Ses serviteurs.', 47),
('المَجِيدُ', 'Le Glorieux', 'Al-Majîd', 'Celui dont la gloire est infinie.', 48),
('البَاعِثُ', 'Celui qui ressuscite', 'Al-Bâ''ith', 'Celui qui ressuscite les morts.', 49),
('الشَّهِيدُ', 'Le Témoin', 'Ash-Shahîd', 'Celui qui est témoin de tout.', 50),
('الحَقُّ', 'Le Vrai', 'Al-Haqq', 'Celui dont l''existence est une certitude absolue.', 51),
('الوَكِيلُ', 'Le Mandataire suprême', 'Al-Wakîl', 'Celui en qui l''on peut se confier totalement.', 52),
('القَوِيُّ', 'Le Très Fort', 'Al-Qawî', 'Celui dont la force est parfaite.', 53),
('المَتِينُ', 'Le Solide', 'Al-Matîn', 'Celui dont la puissance est inébranlable.', 54),
('الوَلِيُّ', 'Le Protecteur', 'Al-Walî', 'Celui qui protège et soutient les croyants.', 55),
('الحَمِيدُ', 'Le Digne de louanges', 'Al-Hamîd', 'Celui qui mérite toutes les louanges.', 56),
('المُحْصِي', 'Celui qui dénombre tout', 'Al-Muhsî', 'Celui qui comptabilise tout sans exception.', 57),
('المُبْدِئُ', 'Celui qui initie la création', 'Al-Mubdi''', 'Celui qui crée pour la première fois.', 58),
('المُعِيدُ', 'Celui qui renouvelle la création', 'Al-Mu''îd', 'Celui qui recréera après la mort.', 59),
('المُحْيِي', 'Celui qui donne la vie', 'Al-Muhyî', 'Celui qui insuffle la vie.', 60),
('المُمِيتُ', 'Celui qui donne la mort', 'Al-Mumît', 'Celui qui fait mourir selon Sa sagesse.', 61),
('الحَيُّ', 'Le Vivant', 'Al-Hayy', 'Celui dont la vie est éternelle et parfaite.', 62),
('القَيُّومُ', 'L''Immuable', 'Al-Qayyûm', 'Celui qui se suffit à Lui-même et soutient tout.', 63),
('الوَاجِدُ', 'Le Riche absolu', 'Al-Wâjid', 'Celui qui trouve tout ce qu''Il veut.', 64),
('المَاجِدُ', 'Le Noble', 'Al-Mâjid', 'Celui dont la noblesse est parfaite.', 65),
('الوَاحِدُ', 'L''Unique', 'Al-Wâhid', 'Celui qui est absolument unique.', 66),
('الأَحَدُ', 'L''Un', 'Al-Ahad', 'Celui qui est seul en son genre.', 67),
('الصَّمَدُ', 'L''Impénétrable', 'As-Samad', 'Celui dont tout le monde a besoin.', 68),
('القَادِرُ', 'Le Capable', 'Al-Qâdir', 'Celui qui a le pouvoir absolu.', 69),
('المُقْتَدِرُ', 'Le Tout-Puissant', 'Al-Muqtadir', 'Celui dont la puissance est parfaite.', 70),
('المُقَدِّمُ', 'Celui qui met en avant', 'Al-Muqaddim', 'Celui qui avance ce qu''Il veut.', 71),
('المُؤَخِّرُ', 'Celui qui reporte', 'Al-Mu''akhkhir', 'Celui qui reporte selon Sa sagesse.', 72),
('الأَوَّلُ', 'Le Premier', 'Al-Awwal', 'Celui qui existe avant toute chose.', 73),
('الآخِرُ', 'Le Dernier', 'Al-Âkhir', 'Celui qui subsistera après toute chose.', 74),
('الظَّاهِرُ', 'Le Manifeste', 'Az-Zâhir', 'Celui dont les signes sont évidents.', 75),
('البَاطِنُ', 'Le Caché', 'Al-Bâtin', 'Celui dont l''essence est imperceptible.', 76),
('الوَالِي', 'Le Gouverneur', 'Al-Wâlî', 'Celui qui gouverne toute chose.', 77),
('المُتَعَالِي', 'Le Très Haut', 'Al-Muta''âlî', 'Celui qui est au-dessus de tout.', 78),
('البَرُّ', 'Le Bienfaisant', 'Al-Barr', 'Celui dont la bonté est infinie.', 79),
('التَّوَّابُ', 'Le Très Repentant', 'At-Tawwâb', 'Celui qui accepte le repentir.', 80),
('المُنْتَقِمُ', 'Le Vengeur', 'Al-Muntaqim', 'Celui qui punit les injustes.', 81),
('العَفُوُّ', 'Le Clément', 'Al-''Afuww', 'Celui qui efface les péchés.', 82),
('الرَّؤُوفُ', 'Le Doux', 'Ar-Ra''ûf', 'Celui dont la douceur est infinie.', 83),
('مَالِكُ المُلْكِ', 'Le Maître du Royaume', 'Mâlik Al-Mulk', 'Celui qui possède tout le royaume.', 84),
('ذُو الجَلَالِ وَالإِكْرَامِ', 'Le Possesseur de la Majesté', 'Dhul-Jalâl wal-Ikrâm', 'Celui qui possède la majesté et la générosité.', 85),
('المُقْسِطُ', 'L''Équitable', 'Al-Muqsit', 'Celui qui agit avec équité.', 86),
('الجَامِعُ', 'Le Rassembleur', 'Al-Jâmi''', 'Celui qui rassemble tout le monde.', 87),
('الغَنِيُّ', 'Le Riche absolu', 'Al-Ghanî', 'Celui qui n''a besoin de rien.', 88),
('المُغْنِي', 'Celui qui enrichit', 'Al-Mughnî', 'Celui qui comble de richesses.', 89),
('المَانِعُ', 'Celui qui prévient', 'Al-Mâni''', 'Celui qui empêche le mal.', 90),
('الضَّارُّ', 'Celui qui nuit', 'Ad-Dârr', 'Celui qui crée le mal selon Sa sagesse.', 91),
('النَّافِعُ', 'Celui qui profite', 'An-Nâfi''', 'Celui qui accorde les bienfaits.', 92),
('النُّورُ', 'La Lumière', 'An-Nûr', 'Celui qui illumine les cœurs et le monde.', 93),
('الهَادِي', 'Le Directeur', 'Al-Hâdî', 'Celui qui guide vers la vérité.', 94),
('البَدِيعُ', 'L''Incomparable', 'Al-Badî''', 'Celui dont la création est unique.', 95),
('البَاقِي', 'L''Éternel', 'Al-Bâqî', 'Celui qui subsiste éternellement.', 96),
('الوَارِثُ', 'L''Héritier', 'Al-Wârith', 'Celui à qui tout reviendra.', 97),
('الرَّشِيدُ', 'Le Bien Guidé', 'Ar-Rashîd', 'Celui dont la direction est parfaite.', 98),
('الصَّبُورُ', 'Le Très Patient', 'As-Sabûr', 'Celui dont la patience est infinie.', 99)
ON CONFLICT DO NOTHING;

-- 6. Créer le bucket pour les cartes de modules
INSERT INTO storage.buckets (id, name, public)
VALUES ('module-cards', 'module-cards', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for module-cards
CREATE POLICY "Anyone can view module card files" ON storage.objects FOR SELECT USING (bucket_id = 'module-cards');
CREATE POLICY "Admins can upload module card files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'module-cards' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete module card files" ON storage.objects FOR DELETE USING (bucket_id = 'module-cards' AND has_role(auth.uid(), 'admin'::app_role));
