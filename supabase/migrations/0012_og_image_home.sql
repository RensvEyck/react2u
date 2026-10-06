-- De deelafbeelding (og:image) van de homepage wees nog naar een stockfoto in
-- de oude WordPress-map op Supabase. Zonder eigen og_image valt de pagina terug
-- op de standaardafbeelding uit de eigen beeldserie (app/(site)/layout.tsx,
-- public/beeld/og/), 1200×630.
update pages
   set og_image = null,
       updated_at = now()
 where og_image like '%/media/wp/%';
