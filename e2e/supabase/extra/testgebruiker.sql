-- Alleen voor de testomgeving: de testbeheerder (rens@react2u.nl, wachtwoord
-- Test-wachtwoord-123), vóór 0006, dat minstens één gebruiker met alle rechten eist.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change, phone_change_token)
values ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rens@react2u.nl', extensions.crypt('Test-wachtwoord-123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","email":"rens@react2u.nl"}', 'email', now(), now(), now());
