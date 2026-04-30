-- Row Level Security policies

alter table public.profiles enable row level security;
alter table public.food_logs enable row level security;
alter table public.water_logs enable row level security;
alter table public.meal_templates enable row level security;
alter table public.weight_logs enable row level security;
alter table public.ai_insights enable row level security;
alter table public.foods enable row level security;

-- Profiles: users can only see/edit their own
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Foods: readable by all authenticated users; only service role can write
create policy "Anyone authenticated can read foods" on public.foods
  for select using (auth.role() = 'authenticated');

-- Food logs
create policy "Users CRUD own food logs" on public.food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Water logs
create policy "Users CRUD own water logs" on public.water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Meal templates
create policy "Users CRUD own templates" on public.meal_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Weight logs
create policy "Users CRUD own weight logs" on public.weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- AI insights (read-only for user, written by edge function with service role)
create policy "Users read own insights" on public.ai_insights
  for select using (auth.uid() = user_id);
