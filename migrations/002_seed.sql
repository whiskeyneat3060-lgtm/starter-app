-- Seed user
INSERT OR IGNORE INTO users (id, name, created_at) VALUES (1, 'Me', '2026-01-01T00:00:00Z');

-- Seed profile
INSERT OR IGNORE INTO profiles (user_id, height_cm, sex, birth_date) VALUES (1, 180, 'male', '1990-01-01');

-- Seed goal
INSERT OR IGNORE INTO goals (id, user_id, target_bodyfat_pct, target_weight_kg, target_lean_kg, target_date, active)
VALUES (1, 1, 12, 75, 66, '2026-09-01', 1);

-- InBody scan
INSERT OR IGNORE INTO inbody_scans (id, user_id, scan_date, weight_kg, bodyfat_pct, fat_mass_kg, skeletal_muscle_kg, lean_mass_kg, bmr)
VALUES (1, 1, '2026-05-01', 82, 19.5, 15.99, 42, 66.01, 1890);

-- Burn entries (2026-06-05 to 2026-06-18)
INSERT OR IGNORE INTO burn_entries (user_id, date, total_kcal, active_kcal, resting_kcal, steps, resting_hr, source) VALUES
(1, '2026-06-05', 2520, 480, 1890, 9200, 58, 'garmin'),
(1, '2026-06-06', 2610, 560, 1890, 11500, 57, 'garmin'),
(1, '2026-06-07', 2450, 410, 1890, 7800, 59, 'garmin'),
(1, '2026-06-08', 2580, 530, 1890, 10200, 57, 'garmin'),
(1, '2026-06-09', 2490, 450, 1890, 8600, 58, 'garmin'),
(1, '2026-06-10', 2700, 610, 1890, 12000, 56, 'garmin'),
(1, '2026-06-11', 2420, 390, 1890, 7200, 60, 'garmin'),
(1, '2026-06-12', 2540, 500, 1890, 9800, 58, 'garmin'),
(1, '2026-06-13', 2630, 590, 1890, 11200, 57, 'garmin'),
(1, '2026-06-14', 2470, 430, 1890, 8100, 59, 'garmin'),
(1, '2026-06-15', 2560, 520, 1890, 10000, 58, 'garmin'),
(1, '2026-06-16', 2680, 600, 1890, 11800, 56, 'garmin'),
(1, '2026-06-17', 2410, 380, 1890, 7000, 61, 'garmin'),
(1, '2026-06-18', 2590, 550, 1890, 10500, 57, 'garmin');

-- Food entries (2026-06-05 to 2026-06-18, realistic ~2100 kcal, ~180g protein)
INSERT OR IGNORE INTO food_entries (user_id, captured_at, meal_bucket, description, kcal, protein_g, carbs_g, fat_g, fibre_g, confidence) VALUES
-- June 5
(1, '2026-06-05T07:30:00Z', 'breakfast', 'Greek yogurt with berries and oats', 420, 32, 48, 8, 5, 0.9),
(1, '2026-06-05T12:30:00Z', 'lunch', 'Grilled chicken breast with quinoa and broccoli', 620, 55, 52, 12, 8, 0.92),
(1, '2026-06-05T19:30:00Z', 'dinner', 'Salmon fillet with sweet potato and asparagus', 580, 48, 42, 18, 6, 0.91),
(1, '2026-06-05T16:00:00Z', 'snack', 'Protein shake with banana', 310, 30, 38, 4, 3, 0.95),
-- June 6
(1, '2026-06-06T07:45:00Z', 'breakfast', 'Egg white omelette with spinach and feta', 380, 36, 8, 14, 3, 0.9),
(1, '2026-06-06T12:45:00Z', 'lunch', 'Turkey wrap with avocado and lettuce', 540, 42, 44, 16, 7, 0.88),
(1, '2026-06-06T19:00:00Z', 'dinner', 'Beef stir fry with brown rice and vegetables', 650, 48, 68, 14, 6, 0.87),
(1, '2026-06-06T15:30:00Z', 'snack', 'Cottage cheese with pineapple', 280, 28, 30, 4, 2, 0.93),
-- June 7
(1, '2026-06-07T08:00:00Z', 'breakfast', 'Overnight oats with protein powder', 440, 34, 52, 10, 6, 0.91),
(1, '2026-06-07T13:00:00Z', 'lunch', 'Tuna salad with mixed greens and olive oil', 480, 46, 12, 22, 4, 0.9),
(1, '2026-06-07T19:30:00Z', 'dinner', 'Chicken tikka masala with cauliflower rice', 560, 52, 28, 20, 5, 0.85),
(1, '2026-06-07T16:30:00Z', 'snack', 'Almonds and apple', 260, 8, 32, 14, 5, 0.94),
-- June 8
(1, '2026-06-08T07:30:00Z', 'breakfast', 'Scrambled eggs with turkey bacon and toast', 490, 38, 32, 18, 2, 0.9),
(1, '2026-06-08T12:30:00Z', 'lunch', 'Grilled shrimp bowl with brown rice', 580, 50, 60, 10, 5, 0.89),
(1, '2026-06-08T19:00:00Z', 'dinner', 'Lean beef burger no bun with salad', 540, 48, 14, 26, 6, 0.88),
(1, '2026-06-08T15:00:00Z', 'snack', 'Protein bar', 240, 20, 28, 8, 3, 0.96),
-- June 9
(1, '2026-06-09T08:00:00Z', 'breakfast', 'Greek yogurt parfait with granola', 410, 30, 50, 10, 4, 0.9),
(1, '2026-06-09T12:45:00Z', 'lunch', 'Chicken and vegetable soup with bread', 520, 44, 46, 12, 7, 0.86),
(1, '2026-06-09T19:30:00Z', 'dinner', 'Baked cod with roasted vegetables', 500, 50, 30, 14, 8, 0.91),
(1, '2026-06-09T16:00:00Z', 'snack', 'Edamame with sea salt', 200, 18, 14, 8, 8, 0.95),
-- June 10
(1, '2026-06-10T07:45:00Z', 'breakfast', 'Protein pancakes with maple syrup', 460, 36, 50, 12, 3, 0.9),
(1, '2026-06-10T12:30:00Z', 'lunch', 'Grilled chicken caesar salad', 550, 52, 24, 20, 5, 0.89),
(1, '2026-06-10T19:00:00Z', 'dinner', 'Pork tenderloin with roasted potatoes and green beans', 620, 52, 48, 16, 7, 0.88),
(1, '2026-06-10T16:30:00Z', 'snack', 'Cottage cheese with berries', 250, 24, 22, 6, 3, 0.93),
-- June 11
(1, '2026-06-11T08:00:00Z', 'breakfast', 'Egg and vegetable scramble', 380, 32, 18, 16, 4, 0.91),
(1, '2026-06-11T13:00:00Z', 'lunch', 'Chicken breast with wild rice and broccoli', 590, 56, 54, 10, 7, 0.9),
(1, '2026-06-11T19:30:00Z', 'dinner', 'Turkey meatballs with zucchini noodles', 510, 52, 22, 18, 5, 0.88),
(1, '2026-06-11T15:30:00Z', 'snack', 'Hummus with veggie sticks', 220, 10, 24, 10, 6, 0.92),
-- June 12
(1, '2026-06-12T07:30:00Z', 'breakfast', 'Smoothie bowl with protein and seeds', 430, 34, 46, 12, 6, 0.9),
(1, '2026-06-12T12:30:00Z', 'lunch', 'Steak salad with quinoa', 600, 54, 40, 20, 6, 0.87),
(1, '2026-06-12T19:00:00Z', 'dinner', 'Baked chicken thighs with sweet potato mash', 570, 46, 44, 16, 5, 0.89),
(1, '2026-06-12T16:00:00Z', 'snack', 'Greek yogurt with honey', 230, 20, 28, 4, 0, 0.94),
-- June 13
(1, '2026-06-13T08:00:00Z', 'breakfast', 'Avocado toast with poached eggs', 450, 26, 36, 22, 7, 0.9),
(1, '2026-06-13T12:45:00Z', 'lunch', 'Grilled salmon with quinoa and kale', 610, 54, 46, 18, 8, 0.91),
(1, '2026-06-13T19:30:00Z', 'dinner', 'Chicken stir fry with brown rice', 570, 50, 56, 12, 6, 0.88),
(1, '2026-06-13T16:30:00Z', 'snack', 'Protein shake', 260, 28, 22, 4, 1, 0.96),
-- June 14
(1, '2026-06-14T07:45:00Z', 'breakfast', 'Oatmeal with protein powder and almond butter', 480, 36, 54, 14, 7, 0.9),
(1, '2026-06-14T12:30:00Z', 'lunch', 'Turkey and cheese wrap with side salad', 520, 44, 40, 16, 5, 0.88),
(1, '2026-06-14T19:00:00Z', 'dinner', 'Grilled tilapia with asparagus and quinoa', 530, 52, 44, 12, 7, 0.9),
(1, '2026-06-14T16:00:00Z', 'snack', 'Mixed nuts and dried fruit', 290, 10, 32, 16, 3, 0.9),
-- June 15
(1, '2026-06-15T08:00:00Z', 'breakfast', 'Egg white frittata with vegetables', 360, 34, 16, 14, 5, 0.91),
(1, '2026-06-15T12:30:00Z', 'lunch', 'Chicken and bean burrito bowl', 640, 56, 62, 14, 12, 0.87),
(1, '2026-06-15T19:30:00Z', 'dinner', 'Lean ground beef with pasta and marinara', 600, 48, 60, 16, 5, 0.86),
(1, '2026-06-15T16:00:00Z', 'snack', 'Rice cakes with peanut butter', 280, 10, 34, 12, 2, 0.92),
-- June 16
(1, '2026-06-16T07:30:00Z', 'breakfast', 'Protein smoothie with oats and banana', 450, 38, 52, 10, 5, 0.91),
(1, '2026-06-16T12:30:00Z', 'lunch', 'Grilled chicken sandwich on whole grain', 560, 48, 48, 14, 6, 0.89),
(1, '2026-06-16T19:00:00Z', 'dinner', 'Shrimp fajitas with peppers and onions', 580, 50, 52, 14, 7, 0.88),
(1, '2026-06-16T16:30:00Z', 'snack', 'Chocolate protein pudding', 240, 26, 24, 6, 2, 0.93),
-- June 17
(1, '2026-06-17T08:00:00Z', 'breakfast', 'French toast with eggs and berries', 440, 30, 52, 14, 4, 0.88),
(1, '2026-06-17T13:00:00Z', 'lunch', 'Cobb salad with grilled chicken', 530, 48, 18, 26, 6, 0.9),
(1, '2026-06-17T19:30:00Z', 'dinner', 'Chicken breast with roasted vegetables', 510, 52, 30, 14, 8, 0.9),
(1, '2026-06-17T16:00:00Z', 'snack', 'Low fat cheese and crackers', 230, 16, 24, 8, 1, 0.91),
-- June 18
(1, '2026-06-18T07:45:00Z', 'breakfast', 'Greek yogurt with protein powder and granola', 420, 38, 44, 8, 3, 0.92),
(1, '2026-06-18T12:30:00Z', 'lunch', 'Tuna and avocado lettuce wraps', 480, 46, 14, 22, 5, 0.9),
(1, '2026-06-18T19:00:00Z', 'dinner', 'Grilled chicken with brown rice and steamed broccoli', 580, 54, 54, 12, 7, 0.91),
(1, '2026-06-18T16:30:00Z', 'snack', 'Apple with almond butter', 270, 8, 34, 14, 5, 0.93);

-- Daily rollup (intake sums per day, burn from burn_entries)
INSERT OR IGNORE INTO daily_rollup (user_id, date, intake_kcal, burn_kcal, balance_kcal) VALUES
(1, '2026-06-05', 1930, 2520, -590),
(1, '2026-06-06', 1850, 2610, -760),
(1, '2026-06-07', 1740, 2450, -710),
(1, '2026-06-08', 1850, 2580, -730),
(1, '2026-06-09', 1630, 2490, -860),
(1, '2026-06-10', 1880, 2700, -820),
(1, '2026-06-11', 1700, 2420, -720),
(1, '2026-06-12', 1830, 2540, -710),
(1, '2026-06-13', 1890, 2630, -740),
(1, '2026-06-14', 1820, 2470, -650),
(1, '2026-06-15', 1880, 2560, -680),
(1, '2026-06-16', 1830, 2680, -850),
(1, '2026-06-17', 1710, 2410, -700),
(1, '2026-06-18', 1750, 2590, -840);
