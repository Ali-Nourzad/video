# T-Choob Video

RTL Persian video production and editing platform using HTML/CSS/JavaScript and Supabase.

## You need to provide
- A new Supabase project
- Supabase Project URL
- Supabase anon/publishable key
- Logo/brand assets if you have them
- Optional Persian font if you want a custom font
- Later: payment gateway details if online payment is added
- Later: backend/OpenAI credentials if AI features are added

Never put a Supabase service-role key or an OpenAI secret key in frontend code.

## Setup
1. Create a new Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Put the Project URL and anon/publishable key in `js/config.js`.
4. Create an account through `signup.html`.
5. In Table Editor, change that user's `profiles.role` to `admin`.
6. Host the folder on GitHub Pages or another web server.

## Pages
- index.html
- login.html
- signup.html
- profile.html
- orders.html
- new-order.html
- order.html
- admin.html
- admin-order.html
- admin-users.html
