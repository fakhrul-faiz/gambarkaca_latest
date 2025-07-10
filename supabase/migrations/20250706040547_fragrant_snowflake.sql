-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  related_entity_id uuid,
  related_entity_type text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  
  -- Ensure type is one of the allowed values
  CONSTRAINT notifications_type_check CHECK (
    type IN ('campaign_status', 'order_status', 'profile_status', 'payment', 'application')
  )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read their own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- System can create notifications for any user
CREATE POLICY "System can create notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_related_entity_id uuid DEFAULT NULL,
  p_related_entity_type text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    related_entity_id,
    related_entity_type
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_related_entity_id,
    p_related_entity_type
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Create trigger function for campaign status changes
CREATE OR REPLACE FUNCTION notify_on_campaign_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_founder_id uuid;
  v_campaign_title text;
  v_admin_ids uuid[];
  v_admin_id uuid;
BEGIN
  -- Get campaign details
  SELECT founder_id, title INTO v_founder_id, v_campaign_title
  FROM public.campaigns
  WHERE id = NEW.id;
  
  -- Get admin IDs
  SELECT array_agg(id) INTO v_admin_ids
  FROM public.profiles
  WHERE role = 'admin';
  
  -- If status changed to active
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Notify founder
    PERFORM create_notification(
      v_founder_id,
      'Campaign Activated',
      'Your campaign "' || v_campaign_title || '" has been activated and is now visible to talents.',
      'campaign_status',
      NEW.id,
      'campaign'
    );
    
    -- Notify admins
    IF v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids
      LOOP
        PERFORM create_notification(
          v_admin_id,
          'New Campaign Activated',
          'Campaign "' || v_campaign_title || '" has been activated.',
          'campaign_status',
          NEW.id,
          'campaign'
        );
      END LOOP;
    END IF;
  
  -- If status changed to rejected
  ELSIF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    -- Notify founder
    PERFORM create_notification(
      v_founder_id,
      'Campaign Rejected',
      'Your campaign "' || v_campaign_title || '" has been rejected. Please review and make necessary changes.',
      'campaign_status',
      NEW.id,
      'campaign'
    );
  
  -- If status changed to completed
  ELSIF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Notify founder
    PERFORM create_notification(
      v_founder_id,
      'Campaign Completed',
      'Your campaign "' || v_campaign_title || '" has been marked as completed.',
      'campaign_status',
      NEW.id,
      'campaign'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for campaign status changes
DROP TRIGGER IF EXISTS campaign_status_notification_trigger ON public.campaigns;
CREATE TRIGGER campaign_status_notification_trigger
AFTER UPDATE OF status ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION notify_on_campaign_status_change();

-- Create trigger function for order status changes
CREATE OR REPLACE FUNCTION notify_on_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_founder_id uuid;
  v_talent_id uuid;
  v_campaign_title text;
  v_admin_ids uuid[];
  v_admin_id uuid;
BEGIN
  -- Get order details
  SELECT 
    o.founder_id, 
    o.talent_id,
    c.title
  INTO 
    v_founder_id, 
    v_talent_id,
    v_campaign_title
  FROM 
    public.orders o
    JOIN public.campaigns c ON o.campaign_id = c.id
  WHERE 
    o.id = NEW.id;
  
  -- Get admin IDs
  SELECT array_agg(id) INTO v_admin_ids
  FROM public.profiles
  WHERE role = 'admin';
  
  -- If status changed to shipped
  IF NEW.status = 'shipped' AND (OLD.status IS NULL OR OLD.status != 'shipped') THEN
    -- Notify talent
    PERFORM create_notification(
      v_talent_id,
      'Product Shipped',
      'The product for "' || v_campaign_title || '" has been shipped to you.',
      'order_status',
      NEW.id,
      'order'
    );
    
  -- If status changed to delivered
  ELSIF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Notify talent
    PERFORM create_notification(
      v_talent_id,
      'Product Delivered',
      'The product for "' || v_campaign_title || '" has been marked as delivered. You can now submit your review.',
      'order_status',
      NEW.id,
      'order'
    );
    
    -- Notify founder
    PERFORM create_notification(
      v_founder_id,
      'Product Delivered',
      'The product for "' || v_campaign_title || '" has been marked as delivered to the talent.',
      'order_status',
      NEW.id,
      'order'
    );
    
  -- If status changed to review_submitted
  ELSIF NEW.status = 'review_submitted' AND (OLD.status IS NULL OR OLD.status != 'review_submitted') THEN
    -- Notify founder
    PERFORM create_notification(
      v_founder_id,
      'Review Submitted',
      'The talent has submitted a review for "' || v_campaign_title || '". Please check and approve it.',
      'order_status',
      NEW.id,
      'order'
    );
    
  -- If status changed to completed
  ELSIF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Notify talent
    PERFORM create_notification(
      v_talent_id,
      'Order Completed',
      'Your review for "' || v_campaign_title || '" has been approved. Payment has been processed.',
      'order_status',
      NEW.id,
      'order'
    );
    
    -- Notify founder
    PERFORM create_notification(
      v_founder_id,
      'Order Completed',
      'The order for "' || v_campaign_title || '" has been completed successfully.',
      'order_status',
      NEW.id,
      'order'
    );
    
    -- Notify admins
    IF v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids
      LOOP
        PERFORM create_notification(
          v_admin_id,
          'Order Completed',
          'An order for "' || v_campaign_title || '" has been completed.',
          'order_status',
          NEW.id,
          'order'
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for order status changes
DROP TRIGGER IF EXISTS order_status_notification_trigger ON public.orders;
CREATE TRIGGER order_status_notification_trigger
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION notify_on_order_status_change();

-- Create trigger function for profile status changes
CREATE OR REPLACE FUNCTION notify_on_profile_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_ids uuid[];
  v_admin_id uuid;
BEGIN
  -- Get admin IDs
  SELECT array_agg(id) INTO v_admin_ids
  FROM public.profiles
  WHERE role = 'admin';
  
  -- If status changed to active
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Notify user
    PERFORM create_notification(
      NEW.id,
      'Account Activated',
      'Your account has been activated. You can now use all platform features.',
      'profile_status',
      NEW.id,
      'profile'
    );
    
    -- If it's a talent, notify admins
    IF NEW.role = 'talent' AND v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids
      LOOP
        PERFORM create_notification(
          v_admin_id,
          'Talent Account Activated',
          'Talent account for "' || NEW.name || '" has been activated.',
          'profile_status',
          NEW.id,
          'profile'
        );
      END LOOP;
    END IF;
    
  -- If status changed to suspended
  ELSIF NEW.status = 'suspended' AND (OLD.status IS NULL OR OLD.status != 'suspended') THEN
    -- Notify user
    PERFORM create_notification(
      NEW.id,
      'Account Suspended',
      'Your account has been suspended. Please contact support for assistance.',
      'profile_status',
      NEW.id,
      'profile'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for profile status changes
DROP TRIGGER IF EXISTS profile_status_notification_trigger ON public.profiles;
CREATE TRIGGER profile_status_notification_trigger
AFTER UPDATE OF status ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION notify_on_profile_status_change();

-- Create trigger function for new campaign applications
CREATE OR REPLACE FUNCTION notify_on_campaign_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign_title text;
  v_founder_id uuid;
  v_talent_name text;
BEGIN
  -- Get campaign details
  SELECT c.title, c.founder_id, p.name
  INTO v_campaign_title, v_founder_id, v_talent_name
  FROM public.campaigns c
  JOIN public.profiles p ON p.id = NEW.talent_id
  WHERE c.id = NEW.campaign_id;
  
  -- Notify founder
  PERFORM create_notification(
    v_founder_id,
    'New Campaign Application',
    v_talent_name || ' has applied to your campaign "' || v_campaign_title || '".',
    'application',
    NEW.id,
    'campaign_application'
  );
  
  -- Notify talent
  PERFORM create_notification(
    NEW.talent_id,
    'Application Submitted',
    'You have successfully applied to the campaign "' || v_campaign_title || '".',
    'application',
    NEW.id,
    'campaign_application'
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new campaign applications
DROP TRIGGER IF EXISTS campaign_application_notification_trigger ON public.campaign_applications;
CREATE TRIGGER campaign_application_notification_trigger
AFTER INSERT ON public.campaign_applications
FOR EACH ROW
EXECUTE FUNCTION notify_on_campaign_application();

-- Create trigger function for application status changes
CREATE OR REPLACE FUNCTION notify_on_application_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign_title text;
  v_founder_id uuid;
  v_talent_name text;
BEGIN
  -- Get campaign details
  SELECT c.title, c.founder_id, p.name
  INTO v_campaign_title, v_founder_id, v_talent_name
  FROM public.campaigns c
  JOIN public.profiles p ON p.id = NEW.talent_id
  WHERE c.id = NEW.campaign_id;
  
  -- If status changed to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Notify talent
    PERFORM create_notification(
      NEW.talent_id,
      'Application Approved',
      'Your application for "' || v_campaign_title || '" has been approved!',
      'application',
      NEW.id,
      'campaign_application'
    );
    
  -- If status changed to rejected
  ELSIF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    -- Notify talent
    PERFORM create_notification(
      NEW.talent_id,
      'Application Rejected',
      'Your application for "' || v_campaign_title || '" has been rejected.',
      'application',
      NEW.id,
      'campaign_application'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for application status changes
DROP TRIGGER IF EXISTS application_status_notification_trigger ON public.campaign_applications;
CREATE TRIGGER application_status_notification_trigger
AFTER UPDATE OF status ON public.campaign_applications
FOR EACH ROW
EXECUTE FUNCTION notify_on_application_status_change();

-- Create trigger function for new transactions
CREATE OR REPLACE FUNCTION notify_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_ids uuid[];
  v_admin_id uuid;
BEGIN
  -- Get admin IDs
  SELECT array_agg(id) INTO v_admin_ids
  FROM public.profiles
  WHERE role = 'admin';
  
  -- If it's a credit transaction (payment received)
  IF NEW.type = 'credit' THEN
    -- Notify user
    PERFORM create_notification(
      NEW.user_id,
      'Payment Received',
      'You have received ' || NEW.amount || ' MYR. ' || NEW.description,
      'payment',
      NEW.id,
      'transaction'
    );
    
    -- Notify admins for admin fees
    IF NEW.description LIKE '%Admin Fee%' AND v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids
      LOOP
        PERFORM create_notification(
          v_admin_id,
          'Admin Fee Received',
          'Platform received ' || NEW.amount || ' MYR in admin fees.',
          'payment',
          NEW.id,
          'transaction'
        );
      END LOOP;
    END IF;
    
  -- If it's a debit transaction (payment made)
  ELSIF NEW.type = 'debit' THEN
    -- Notify user
    PERFORM create_notification(
      NEW.user_id,
      'Payment Made',
      'You have paid ' || NEW.amount || ' MYR. ' || NEW.description,
      'payment',
      NEW.id,
      'transaction'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new transactions
DROP TRIGGER IF EXISTS transaction_notification_trigger ON public.transactions;
CREATE TRIGGER transaction_notification_trigger
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION notify_on_transaction();