CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
CREATE TYPE public.product_kind AS ENUM ('bouquet', 'single', 'gift');
CREATE TYPE public.order_status AS ENUM ('new', 'in_progress', 'delivered', 'cancelled');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  kind public.product_kind NOT NULL DEFAULT 'bouquet',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  color TEXT,
  composition TEXT,
  description TEXT,
  care_tip TEXT,
  image_url TEXT,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON public.products FOR SELECT TO anon, authenticated
  USING (is_visible = true);
CREATE POLICY "products_admin_read" ON public.products FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "products_admin_write" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "products_admin_update" ON public.products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "products_admin_delete" ON public.products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  delivery_date DATE,
  delivery_slot TEXT,
  address TEXT,
  comment TEXT,
  card_text TEXT,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'new',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_public_insert" ON public.orders FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "orders_admin_read" ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "orders_admin_update" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "orders_admin_delete" ON public.orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_public_insert" ON public.order_items FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "order_items_admin_read" ON public.order_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "order_items_admin_write" ON public.order_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "order_items_admin_delete" ON public.order_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roles_admin_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.register_staff_member(_full_name TEXT)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _email TEXT;
  _role public.app_role;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (_uid, _email, NULLIF(_full_name, ''))
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
        email = COALESCE(EXCLUDED.email, public.profiles.email);

  SELECT role INTO _role FROM public.user_roles WHERE user_id = _uid ORDER BY role LIMIT 1;
  IF _role IS NOT NULL THEN
    RETURN _role;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin');
    RETURN 'admin';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'staff')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN 'staff';
END;
$$;

REVOKE ALL ON FUNCTION public.register_staff_member(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_staff_member(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.products (slug, title, kind, price, color, composition, description, care_tip, in_stock, is_visible, sort_order) VALUES
('pervyy-sneg', 'Первый снег', 'bouquet', 3900, 'Белый', '25 белых тюльпанов, лента из хлопка', 'Тихий белый букет, похожий на утро в марте: свежесть, лёгкость и запах талой воды.', 'Подрежьте стебли под углом и поставьте в прохладную воду — тюльпаны любят холод.', true, true, 10),
('rumyanoe-utro', 'Румяное утро', 'bouquet', 4500, 'Розовый', '35 пудрово-розовых тюльпанов, крафт-бумага', 'Пудровый розовый в мягкой бумаге — самый весенний из наших букетов.', 'Меняйте воду каждый день, держите вдали от фруктов.', true, true, 20),
('solnechnyy-dozhd', 'Солнечный дождь', 'bouquet', 4200, 'Жёлтый', '31 жёлтый тюльпан, зелень эвкалипта', 'Жёлтые тюльпаны с эвкалиптом — как первое тёплое солнце в окне.', 'Обрежьте нижние листья, чтобы вода дольше оставалась чистой.', true, true, 30),
('malinovyy-vecher', 'Малиновый вечер', 'bouquet', 5100, 'Красный', '41 малиновый тюльпан, шёлковая лента', 'Насыщенный малиновый — для признаний без слов.', 'Тюльпаны продолжают расти в вазе, оставьте им место.', true, true, 40),
('siren-i-sneg', 'Сирень и снег', 'bouquet', 5400, 'Сиреневый', '25 сиреневых и 10 белых тюльпанов', 'Сиреневые тюльпаны с белыми акцентами — нежная, чуть загадочная пара.', 'Держите букет подальше от сквозняков и отопления.', true, true, 50),
('devyat-tulpanov', 'Девять тюльпанов', 'bouquet', 1890, 'Микс', '9 тюльпанов на выбор, лёгкая упаковка', 'Маленький букет для повода без повода.', 'Свежая прохладная вода — и букет простоит дольше недели.', true, true, 60),
('tulpan-poshtuchno-belyy', 'Тюльпан белый, поштучно', 'single', 130, 'Белый', '1 белый тюльпан', 'Соберите свой букет — по одному тюльпану, как вам нравится.', 'Просите продавца подрезать стебли перед сборкой.', true, true, 70),
('tulpan-poshtuchno-rozovyy', 'Тюльпан розовый, поштучно', 'single', 130, 'Розовый', '1 розовый тюльпан', 'Пудровый розовый — самый популярный оттенок весны.', 'Держите цветы в воде до момента вручения.', true, true, 80),
('vaza-tuman', 'Ваза «Туман»', 'gift', 2400, 'Стекло', 'Стеклянная ваза, 24 см', 'Матовое стекло цвета утреннего туманa — тюльпаны в ней смотрятся особенно тихо.', 'Мойте вазу тёплой водой без абразивов.', true, true, 90),
('otkrytka-vesna', 'Открытка «Весна»', 'gift', 250, 'Крем', 'Открытка на дизайнерской бумаге + конверт', 'Напишем от руки ваши слова и вложим в букет.', 'Текст открытки укажите в комментарии к заказу.', true, true, 100);