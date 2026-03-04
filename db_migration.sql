-- Bulk Migration for Library Configuration
-- Clears existing configuration and inserts new structured hierarchy
BEGIN;
DELETE FROM config_dropdowns WHERE type IN ('lib_type', 'lib_kit');

INSERT INTO config_dropdowns (id, type, value, parent_id) VALUES
  ('9d48b40c-9246-443b-b5e8-46a4ac75f385', 'lib_type', 'Native WGS', NULL),
  ('00d70ba1-863e-425c-9272-cd50f04096ea', 'lib_type', 'DNA/RNA library', NULL),
  ('5ae97c0a-aef3-4a8c-b6a4-1d4d4339850d', 'lib_type', '10X Genomics', NULL),
  ('19554ce7-7938-4939-b5c0-8b722c6f3a6e', 'lib_type', 'Parse Bioscience', NULL),
  ('94b440a3-b17b-46b0-8b4b-23769a284f0a', 'lib_type', 'Olink Proteomics', NULL),
  ('a92aa3b1-e80d-44f1-b639-4a08a96ec2fb', 'lib_type', 'Ancient DNA', NULL),
  ('46e42aa0-9097-4682-813f-f2a12e9531ac', 'lib_type', 'ppmSeq', NULL),
  ('cf92152f-dc01-42d6-9256-891a1608e6d5', 'lib_type', 'Other', NULL);

INSERT INTO config_dropdowns (id, type, value, parent_id) VALUES
  ('94f17959-9d2f-4d91-b632-f40f8fc22960', 'lib_kit', 'WGS native gDNA', '9d48b40c-9246-443b-b5e8-46a4ac75f385'),
  ('2650277f-3177-4bd1-b05d-f768e3702674', 'lib_kit', 'RNA-seq', '00d70ba1-863e-425c-9272-cd50f04096ea'),
  ('3f2a459c-208f-40eb-974c-20f4692c5dd4', 'lib_kit', 'TruSeq style library', '00d70ba1-863e-425c-9272-cd50f04096ea'),
  ('e418da66-ebfc-4b6f-88ec-bb55791b7863', 'lib_kit', 'Nextera style library', '00d70ba1-863e-425c-9272-cd50f04096ea'),
  ('2498a88b-a99b-43cd-8f7b-dd796b9a19f3', 'lib_kit', 'IDT Methyl-Seq', '00d70ba1-863e-425c-9272-cd50f04096ea'),
  ('323d384e-de17-4b9a-bb57-760a9013fa1e', 'lib_kit', 'EM-seq (NEB)', '00d70ba1-863e-425c-9272-cd50f04096ea'),
  ('a20a887f-408f-4768-955b-47b36b60cb8d', 'lib_kit', 'IDT xGen(FFPE, cfDNA)', '00d70ba1-863e-425c-9272-cd50f04096ea'),
  ('d325d153-d12e-46c9-be5d-dc50146648ce', 'lib_kit', 'low-pass WGS (Twist FlexPrep UHT)', '00d70ba1-863e-425c-9272-cd50f04096ea'),
  ('264eda78-f4fb-4d6a-bc04-3b4d564f2f5d', 'lib_kit', '10X 3'' scRNA v4', '5ae97c0a-aef3-4a8c-b6a4-1d4d4339850d'),
  ('2c2961a3-dcba-43e3-9b95-819631da64a5', 'lib_kit', '10x 3'' Feature Barcoding v4', '5ae97c0a-aef3-4a8c-b6a4-1d4d4339850d'),
  ('00ed1f5d-0ab6-4844-bb7f-4e208e134195', 'lib_kit', '10X 3'' scRNA v3', '5ae97c0a-aef3-4a8c-b6a4-1d4d4339850d'),
  ('55c33a56-90fc-466e-aedb-c24ca636f08c', 'lib_kit', '10X 5'' scRNA v3', '5ae97c0a-aef3-4a8c-b6a4-1d4d4339850d'),
  ('4186c351-5816-4ed2-80ae-2677c40ec3c7', 'lib_kit', '10X 5'' scRNA v2', '5ae97c0a-aef3-4a8c-b6a4-1d4d4339850d'),
  ('5903b277-88a2-43ec-8c71-ad17a03ba216', 'lib_kit', '10x 5'' Feature Barcoding v3', '5ae97c0a-aef3-4a8c-b6a4-1d4d4339850d'),
  ('4b8ab5b7-a54d-4246-aa99-f589dbbc7ef7', 'lib_kit', '10x 5'' scRNA v3 - CRISPR', '5ae97c0a-aef3-4a8c-b6a4-1d4d4339850d'),
  ('e59af2bb-df21-455b-a715-ab79b4bcd89e', 'lib_kit', '10x Flex v1 -Gene Expression', '5ae97c0a-aef3-4a8c-b6a4-1d4d4339850d'),
  ('d7c10438-1909-41b9-89e8-e5fe56617693', 'lib_kit', '10x Flex v1 - CRISPR', '5ae97c0a-aef3-4a8c-b6a4-1d4d4339850d'),
  ('0a256aef-560a-4c70-9027-2753948f204d', 'lib_kit', '10x Visium HD (human)', '5ae97c0a-aef3-4a8c-b6a4-1d4d4339850d'),
  ('355b9a84-b754-42d0-9714-77683d8598a8', 'lib_kit', '10x Visium HD (mouse)', '5ae97c0a-aef3-4a8c-b6a4-1d4d4339850d'),
  ('2fac472e-6eac-47a6-b776-c7f690f2cba3', 'lib_kit', '10x Visium HD (generic)', '5ae97c0a-aef3-4a8c-b6a4-1d4d4339850d'),
  ('cf7df4e2-c220-4886-9727-f9303696f43f', 'lib_kit', '10x Multiome (gene expression)', '5ae97c0a-aef3-4a8c-b6a4-1d4d4339850d'),
  ('3397d564-bf0c-40b1-89be-230b33709ddb', 'lib_kit', '10x Multiome (ATAC)', '5ae97c0a-aef3-4a8c-b6a4-1d4d4339850d'),
  ('fb759924-1973-410d-bec6-4961be8490b4', 'lib_kit', '10x ATAC v2', '5ae97c0a-aef3-4a8c-b6a4-1d4d4339850d'),
  ('e3ca48e8-da83-4865-aabc-b3fc490aacca', 'lib_kit', 'Parse scRNA v2', '19554ce7-7938-4939-b5c0-8b722c6f3a6e'),
  ('1972df79-e2df-45f4-aee2-c66bf84d6dda', 'lib_kit', 'Parse scRNA v3', '19554ce7-7938-4939-b5c0-8b722c6f3a6e'),
  ('25b4b497-89b0-468b-a31a-e48c6c5ba250', 'lib_kit', 'Olink Explore HT', '94b440a3-b17b-46b0-8b4b-23769a284f0a'),
  ('3acee133-cc47-4ae7-b539-10ffc8f9a3d0', 'lib_kit', 'Olink Explore HT (Legacy)', '94b440a3-b17b-46b0-8b4b-23769a284f0a'),
  ('736e5dce-8a88-4488-a7a7-556ce7457fc5', 'lib_kit', 'Olink Explore 3072', '94b440a3-b17b-46b0-8b4b-23769a284f0a'),
  ('bfaa1189-1e0c-4c86-bdbd-6637257d2a5f', 'lib_kit', 'Olink Reveal', '94b440a3-b17b-46b0-8b4b-23769a284f0a'),
  ('f7872398-7b0d-42af-8ee9-7e38a33a17ac', 'lib_kit', 'Ancient DNA - double stranded', 'a92aa3b1-e80d-44f1-b639-4a08a96ec2fb'),
  ('92779a02-e8cf-4d21-972c-619c4c9d4199', 'lib_kit', 'Ancient DNA - single stranded', 'a92aa3b1-e80d-44f1-b639-4a08a96ec2fb'),
  ('91d664f0-78ab-4a85-a852-196503e3e5df', 'lib_kit', 'ppmSeq', '46e42aa0-9097-4682-813f-f2a12e9531ac'),
  ('424d78f6-d89b-4258-9719-4ef127c09457', 'lib_kit', 'ppmSeq (Legacy) V5', '46e42aa0-9097-4682-813f-f2a12e9531ac'),
  ('9d5d9364-4d81-4435-99a1-d56ffa8dd069', 'lib_kit', 'Other', 'cf92152f-dc01-42d6-9256-891a1608e6d5');

COMMIT;