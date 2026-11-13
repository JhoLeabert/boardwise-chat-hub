CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.tasks (user_id, title, description, status, priority, category, progress, position, comments, files, due_date) VALUES
  (NEW.id,'Design task card component','Design a reusable task card component for the board.','todo','medium','UI Design',0,1,0,0,current_date+7),
  (NEW.id,'Set up project API','Create the initial API endpoints for managing projects.','in_progress','low','Backend',34,1,8,2,current_date+5),
  (NEW.id,'Build task detail modal','Create a modal view to display and edit task details.','in_progress','low','Frontend',55,2,12,1,current_date+4),
  (NEW.id,'Fix login redirect issue','Fix the issue where users are not redirected after login.','in_progress','medium','Bug',23,3,16,3,current_date+2),
  (NEW.id,'Implement Kanban drag and drop','Add drag and drop interaction between columns.','review','medium','Frontend',59,1,18,4,current_date+3),
  (NEW.id,'Test project creation flow','Verify the project creation flow works correctly.','review','high','QA',74,2,22,3,current_date+1),
  (NEW.id,'Design homepage hero section','Create a new hero section layout for the homepage.','done','high','UI Design',100,1,26,7,current_date-2),
  (NEW.id,'Write onboarding guide','Create a short guide to help new users get started.','done','low','Documentation',100,2,32,3,current_date-3),
  (NEW.id,'Configure staging environment','Set up the staging environment for testing.','done','medium','DevOps',100,3,41,8,current_date-5);
  RETURN NEW;
END; $$;
CREATE POLICY "avatar delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);