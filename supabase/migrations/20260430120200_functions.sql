-- Helper SQL functions

-- Auto-create profile shell on user signup (filled in onboarding)
create function public.handle_new_user() returns trigger as $$
begin
  -- We don't insert profile here; let onboarding screen do it with full data
  return new;
end;
$$ language plpgsql security definer;

-- Helper: compute BMR (Mifflin-St Jeor)
create function public.calculate_bmr(
  p_weight_kg numeric, p_height_cm numeric, p_age integer, p_gender text
) returns numeric as $$
begin
  if p_gender = 'male' then
    return (10 * p_weight_kg) + (6.25 * p_height_cm) - (5 * p_age) + 5;
  elsif p_gender = 'female' then
    return (10 * p_weight_kg) + (6.25 * p_height_cm) - (5 * p_age) - 161;
  else
    return (10 * p_weight_kg) + (6.25 * p_height_cm) - (5 * p_age) - 78;
  end if;
end;
$$ language plpgsql immutable;
