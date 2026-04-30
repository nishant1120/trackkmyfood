-- Allow users to insert their own AI insights from the client (cache writes).
create policy "Users insert own insights" on public.ai_insights
  for insert with check (auth.uid() = user_id);
