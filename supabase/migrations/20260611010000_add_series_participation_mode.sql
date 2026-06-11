alter table public.series
add column participation_mode text not null default 'director';

alter table public.series_memory
add column participation_mode text not null default 'director';

alter table public.series
add constraint series_participation_mode_check
check (participation_mode in ('director', 'character'));

alter table public.series_memory
add constraint series_memory_participation_mode_check
check (participation_mode in ('director', 'character'));
