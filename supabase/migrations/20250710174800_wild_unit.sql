/*
  # Create Direct Messages Table

  1. New Tables
    - `direct_messages` - For storing one-on-one messages between users
      - `id` (uuid, primary key)
      - `sender_id` (uuid, foreign key to profiles)
      - `receiver_id` (uuid, foreign key to profiles)
      - `content` (text)
      - `is_read` (boolean)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `direct_messages` table
    - Add policies for users to read their own messages
    - Add policies for users to create messages
    - Add policies for users to update their own messages
*/

-- Create direct_messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver_id ON public.direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON public.direct_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_is_read ON public.direct_messages(is_read);

-- Enable Row Level Security
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read messages where they are either the sender or receiver
CREATE POLICY "Users can read their own direct messages"
  ON public.direct_messages
  FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() OR 
    receiver_id = auth.uid()
  );

-- Users can insert messages where they are the sender
CREATE POLICY "Users can send direct messages"
  ON public.direct_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
  );

-- Users can update messages where they are the receiver (e.g., to mark as read)
CREATE POLICY "Users can update direct messages they received"
  ON public.direct_messages
  FOR UPDATE
  TO authenticated
  USING (
    receiver_id = auth.uid()
  );

-- Admins can read all messages
CREATE POLICY "Admins can read all direct messages"
  ON public.direct_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to mark a message as read
CREATE OR REPLACE FUNCTION mark_direct_message_as_read(message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.direct_messages
  SET is_read = true
  WHERE id = message_id AND receiver_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Create function to mark all messages from a sender as read
CREATE OR REPLACE FUNCTION mark_all_messages_as_read(sender_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.direct_messages
  SET is_read = true
  WHERE sender_id = sender_id_param AND receiver_id = auth.uid() AND is_read = false
  RETURNING COUNT(*) INTO updated_count;
  
  RETURN updated_count;
END;
$$;

-- Create trigger function for new direct messages
CREATE OR REPLACE FUNCTION notify_on_direct_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sender_name text;
BEGIN
  -- Get sender name
  SELECT name INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;
  
  -- Create notification for receiver
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    related_entity_id,
    related_entity_type,
    is_read
  ) VALUES (
    NEW.receiver_id,
    'New Message',
    'You have received a new message from ' || sender_name,
    'message',
    NEW.id,
    'direct_message',
    false
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new direct messages
CREATE TRIGGER direct_message_notification_trigger
AFTER INSERT ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION notify_on_direct_message();