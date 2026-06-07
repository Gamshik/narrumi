grant usage on schema public to authenticated;

grant select, insert, update, delete
on table public.series
to authenticated;

grant select, insert, update, delete
on table public.series_memory
to authenticated;

grant select, insert, update, delete
on table public.episodes
to authenticated;

grant select, insert, update, delete
on table public.word_sets
to authenticated;

grant select, insert, update, delete
on table public.learning_signals
to authenticated;

grant select, insert, update, delete
on table public.preferences
to authenticated;
