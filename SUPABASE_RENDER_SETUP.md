# Arquitetura antiga: Render + snapshot Supabase (obsoleto)

Este guia descrevia a versão anterior do FOCO que executava a API no Render e, opcionalmente, armazenava o estado em uma única linha JSON no Supabase. A aplicação foi migrada para uma Edge Function e tabelas relacionais do Supabase, portanto **não siga mais estas instruções**.

Use o guia atual: [SUPABASE_ONLY_SETUP.md](./SUPABASE_ONLY_SETUP.md).

A migration `20261027_foco_app_state.sql` pertence à antiga arquitetura de snapshot e não é necessária para a API relacional atual.
