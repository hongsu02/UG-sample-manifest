-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  organization TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  order_no TEXT UNIQUE,
  quotation_id TEXT,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Registered', 'Received')),
  contact_info JSONB,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: samples
CREATE TABLE samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  sample_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: libraries
CREATE TABLE libraries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  lib_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: running_info
CREATE TABLE running_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  run_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: config_dropdowns
CREATE TABLE config_dropdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  parent_id UUID REFERENCES config_dropdowns(id) ON DELETE CASCADE, -- used if a kit depends on a lib_type
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default Config Data Example (Optional)
INSERT INTO config_dropdowns (type, value) VALUES ('lib_type', 'RNA-Seq');
-- We can add kits dependent on the above by using its ID as parent_id

-- Security Definer Function to prevent infinite recursion when checking roles
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can read/write their own profiles. Admins can read all.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING ( is_admin() );
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Orders: Users can read/write their own orders. Admins can read/write all.
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can fully manage their own orders" ON orders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all orders" ON orders FOR ALL USING ( is_admin() );

-- cascade RLS rules or simplistic approach since related tables filter by order_id:
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can fully manage their own samples" ON samples FOR ALL USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = samples.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Admins can manage all samples" ON samples FOR ALL USING ( is_admin() );

ALTER TABLE libraries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can fully manage their own libraries" ON libraries FOR ALL USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = libraries.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Admins can manage all libraries" ON libraries FOR ALL USING ( is_admin() );

ALTER TABLE running_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can fully manage their own run info" ON running_info FOR ALL USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = running_info.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Admins can manage all run info" ON running_info FOR ALL USING ( is_admin() );

-- Config Dropdowns: Anyone can read, only Admins can write
ALTER TABLE config_dropdowns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read config dropdowns" ON config_dropdowns FOR SELECT USING (true);
CREATE POLICY "Admins can manage config dropdowns" ON config_dropdowns FOR ALL USING ( is_admin() ) WITH CHECK ( is_admin() );
