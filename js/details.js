const SUPABASE_URL = "https://nrocrmherkkprjydhmyl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb2NybWhlcmtrcHJqeWRobXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExOTg3OTMsImV4cCI6MjEwNjc3NDc5M30._U3cLoI0F-KzcvZErpBGcnanHAzNj3frVMEg4tPelrE";
const supabasedetail = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");
 
async function loadProduct() {
  const { data: product } = await supabasedetail
    .from("product")
    .select("*, category(category_name)")
    .eq("product_id", productId)
    .single();
 
  if (!product) {
    document.getElementById("detail").innerHTML = "<p>Product not found.</p>";
    return;
  }
  document.getElementById("detail").innerHTML = `
    <h2>${product.name}</h2>
    <p>${product.description}</p>
    <p>AED ${product.price}</p>
    <p>Category: ${product.category.category_name}</p>`;
}
loadProduct();
