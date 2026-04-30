-- NutriTrack initial schema

-- Profiles (linked 1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  age integer not null check (age > 0 and age < 150),
  gender text not null check (gender in ('male', 'female', 'other')),
  height_cm numeric(5,2) not null check (height_cm > 0),
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  activity_level text not null check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  medical_conditions text[],
  dietary_preferences text[],
  daily_calorie_goal integer,
  daily_protein_goal_g integer,
  daily_carbs_goal_g integer,
  daily_fats_goal_g integer,
  daily_fibre_goal_g integer,
  daily_water_goal_ml integer default 2500,
  theme text default 'dark' check (theme in ('dark', 'light', 'system')),
  notifications_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Master food database
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('ifct', 'usda', 'openfoodfacts', 'user_generated', 'ai_generated')),
  external_id text,
  name text not null,
  name_hindi text,
  brand text,
  category text,
  cuisine text,
  serving_size_g numeric(8,2) not null,
  calories_kcal numeric(8,2) not null,
  protein_g numeric(8,2) not null default 0,
  carbs_g numeric(8,2) not null default 0,
  fats_g numeric(8,2) not null default 0,
  fibre_g numeric(8,2) not null default 0,
  vitamin_a_mcg numeric(8,2) default 0,
  vitamin_c_mg numeric(8,2) default 0,
  vitamin_d_mcg numeric(8,2) default 0,
  vitamin_b12_mcg numeric(8,2) default 0,
  iron_mg numeric(8,2) default 0,
  calcium_mg numeric(8,2) default 0,
  extra_nutrients jsonb default '{}',
  search_vector tsvector,
  created_at timestamptz default now()
);

create index idx_foods_search on public.foods using gin(search_vector);
create index idx_foods_category on public.foods(category);
create index idx_foods_cuisine on public.foods(cuisine);

create function public.foods_search_trigger() returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.name_hindi, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.brand, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.category, '')), 'C');
  return new;
end;
$$ language plpgsql;

create trigger foods_search_update
  before insert or update on public.foods
  for each row execute function public.foods_search_trigger();

-- Daily food log
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid references public.foods(id),
  ai_food_data jsonb,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  quantity numeric(8,2) not null,
  unit text not null check (unit in ('g', 'ml', 'cup', 'piece', 'serving')),
  calories_kcal numeric(8,2) not null,
  protein_g numeric(8,2) not null default 0,
  carbs_g numeric(8,2) not null default 0,
  fats_g numeric(8,2) not null default 0,
  fibre_g numeric(8,2) not null default 0,
  vitamin_a_mcg numeric(8,2) default 0,
  vitamin_c_mg numeric(8,2) default 0,
  vitamin_d_mcg numeric(8,2) default 0,
  vitamin_b12_mcg numeric(8,2) default 0,
  iron_mg numeric(8,2) default 0,
  calcium_mg numeric(8,2) default 0,
  logged_via text not null check (logged_via in ('search', 'camera', 'ai_text', 'barcode', 'template')),
  photo_url text,
  notes text,
  consumed_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create index idx_food_logs_user_date on public.food_logs(user_id, consumed_at desc);

-- Water log
create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_ml integer not null check (amount_ml > 0),
  consumed_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create index idx_water_logs_user_date on public.water_logs(user_id, consumed_at desc);

-- Meal templates
create table public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  items jsonb not null,
  created_at timestamptz default now()
);

-- Weight history
create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(5,2) not null,
  logged_at timestamptz not null default now()
);

-- AI insights cache
create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  insight_type text not null,
  content text not null,
  data_snapshot jsonb,
  generated_at timestamptz default now(),
  expires_at timestamptz
);

create index idx_ai_insights_user on public.ai_insights(user_id, generated_at desc);

-- Streak tracking view
create view public.user_streaks as
select
  user_id,
  count(distinct date(consumed_at)) as total_days_logged,
  max(date(consumed_at)) as last_log_date
from public.food_logs
group by user_id;
