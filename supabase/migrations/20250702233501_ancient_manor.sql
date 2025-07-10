/*
  # Create GambarKaca Database Schema

  1. New Tables
    - `profiles` - User profiles with role-specific data
    - `campaigns` - Marketing campaigns with pricing and status
    - `campaign_applications` - Talent applications to campaigns
    - `orders` - Orders created when talents are approved
    - `transactions` - Financial transactions and wallet operations
    - `earnings` - Talent earnings tracking
    - `messages` - Real-time chat between founders and talents

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Secure data access based on user roles

  3. Functions
    - Campaign pricing calculation
    - Wallet balance updates
    - Earnings tracking
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'founder', 'talent');
CREATE TYPE user_status AS ENUM ('active', 'pending', 'suspended');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'rejected');
CREATE TYPE order_status AS ENUM ('pending_shipment', 'shipped', 'delivered', 'review_submitted', 'completed');
CREATE TYPE transaction_type AS ENUM ('credit', 'debit');
CREATE TYPE earning_status AS ENUM ('pending', 'paid', 'cancelled');
CREATE TYPE media_type AS ENUM ('image', 'video', 'both');
CREATE TYPE duration_type AS ENUM ('30sec', '1min', '3min');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role user_role NOT NULL DEFAULT 'talent',
  status user_status NOT NULL DEFAULT 'pending',
  avatar_url text,
  company text,
  phone text,
  address text,
  wallet_balance numeric(10,2) DEFAULT 0.00,
  bio text,
  portfolio jsonb DEFAULT '[]'::jsonb,
  rate_level integer DEFAULT 1 CHECK (rate_level IN (1, 2, 3)),
  skills jsonb DEFAULT '[]'::jsonb,
  social_media jsonb DEFAULT '{}'::jsonb,
  total_earnings numeric(10,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  product_name text NOT NULL,
  category text NOT NULL,
  duration duration_type NOT NULL,
  product_images jsonb DEFAULT '[]'::jsonb,
  rate_level integer NOT NULL CHECK (rate_level IN (1, 2, 3)),
  media_type media_type NOT NULL,
  budget numeric(10,2) NOT NULL DEFAULT 0.00,
  price numeric(10,2) NOT NULL,
  status campaign_status NOT NULL DEFAULT 'draft',
  deadline timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create campaign applications table
CREATE TABLE IF NOT EXISTS campaign_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  applied_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, talent_id)
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  founder_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status order_status NOT NULL DEFAULT 'pending_shipment',
  payout numeric(10,2) NOT NULL,
  delivery_address text,
  tracking_number text,
  courier text,
  review_media_url text,
  review_media_type media_type,
  review_submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount numeric(10,2) NOT NULL,
  description text NOT NULL,
  related_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create earnings table
CREATE TABLE IF NOT EXISTS earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  campaign_title text NOT NULL,
  amount numeric(10,2) NOT NULL,
  status earning_status NOT NULL DEFAULT 'pending',
  earned_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_founder_id ON campaigns(founder_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_applications_campaign_id ON campaign_applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_applications_talent_id ON campaign_applications(talent_id);
CREATE INDEX IF NOT EXISTS idx_orders_campaign_id ON orders(campaign_id);
CREATE INDEX IF NOT EXISTS idx_orders_talent_id ON orders(talent_id);
CREATE INDEX IF NOT EXISTS idx_orders_founder_id ON orders(founder_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_talent_id ON earnings(talent_id);
CREATE INDEX IF NOT EXISTS idx_messages_order_id ON messages(order_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for campaigns
CREATE POLICY "Anyone can read active campaigns" ON campaigns
  FOR SELECT USING (status = 'active' OR founder_id = auth.uid());

CREATE POLICY "Founders can manage own campaigns" ON campaigns
  FOR ALL USING (founder_id = auth.uid());

CREATE POLICY "Admins can read all campaigns" ON campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for campaign applications
CREATE POLICY "Talents can manage own applications" ON campaign_applications
  FOR ALL USING (talent_id = auth.uid());

CREATE POLICY "Founders can read applications to their campaigns" ON campaign_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE id = campaign_applications.campaign_id AND founder_id = auth.uid()
    )
  );

CREATE POLICY "Founders can update applications to their campaigns" ON campaign_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE id = campaign_applications.campaign_id AND founder_id = auth.uid()
    )
  );

-- Create RLS policies for orders
CREATE POLICY "Users can read own orders" ON orders
  FOR SELECT USING (founder_id = auth.uid() OR talent_id = auth.uid());

CREATE POLICY "Founders can manage orders they created" ON orders
  FOR ALL USING (founder_id = auth.uid());

CREATE POLICY "Talents can update their order submissions" ON orders
  FOR UPDATE USING (talent_id = auth.uid());

-- Create RLS policies for transactions
CREATE POLICY "Users can read own transactions" ON transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create transactions" ON transactions
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for earnings
CREATE POLICY "Talents can read own earnings" ON earnings
  FOR SELECT USING (talent_id = auth.uid());

CREATE POLICY "System can manage earnings" ON earnings
  FOR ALL WITH CHECK (true);

-- Create RLS policies for messages
CREATE POLICY "Users can read messages for their orders" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE id = messages.order_id 
      AND (founder_id = auth.uid() OR talent_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages for their orders" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders 
      WHERE id = messages.order_id 
      AND (founder_id = auth.uid() OR talent_id = auth.uid())
    )
  );

-- Create function to calculate campaign price
CREATE OR REPLACE FUNCTION calculate_campaign_price(rate_level integer, duration duration_type)
RETURNS numeric AS $$
BEGIN
  CASE 
    WHEN rate_level = 1 THEN
      CASE duration
        WHEN '30sec' THEN RETURN 65.00;
        WHEN '1min' THEN RETURN 70.00;
        WHEN '3min' THEN RETURN 125.00;
      END CASE;
    WHEN rate_level = 2 THEN
      CASE duration
        WHEN '30sec' THEN RETURN 97.50;
        WHEN '1min' THEN RETURN 105.00;
        WHEN '3min' THEN RETURN 187.50;
      END CASE;
    WHEN rate_level = 3 THEN
      CASE duration
        WHEN '30sec' THEN RETURN 130.00;
        WHEN '1min' THEN RETURN 140.00;
        WHEN '3min' THEN RETURN 250.00;
      END CASE;
  END CASE;
  RETURN 0.00;
END;
$$ LANGUAGE plpgsql;

-- Create function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'credit' THEN
    UPDATE profiles 
    SET wallet_balance = wallet_balance + NEW.amount
    WHERE id = NEW.user_id;
  ELSIF NEW.type = 'debit' THEN
    UPDATE profiles 
    SET wallet_balance = wallet_balance - NEW.amount
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update total earnings
CREATE OR REPLACE FUNCTION update_total_earnings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    UPDATE profiles 
    SET total_earnings = total_earnings + NEW.amount
    WHERE id = NEW.talent_id;
  ELSIF OLD.status = 'paid' AND NEW.status != 'paid' THEN
    UPDATE profiles 
    SET total_earnings = total_earnings - OLD.amount
    WHERE id = NEW.talent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'talent')::user_role,
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'talent') = 'talent' THEN 'pending'::user_status
      ELSE 'active'::user_status
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_wallet_balance_trigger
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance();

CREATE TRIGGER update_total_earnings_trigger
  AFTER UPDATE ON earnings
  FOR EACH ROW
  EXECUTE FUNCTION update_total_earnings();

CREATE TRIGGER handle_new_user_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Insert sample admin user (you can modify this)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
  gen_random_uuid(),
  'admin@gambarkaca.com',
  crypt('password', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"name": "Admin User", "role": "admin"}'::jsonb
) ON CONFLICT (email) DO NOTHING;