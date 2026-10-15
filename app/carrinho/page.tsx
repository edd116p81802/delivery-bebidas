import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartContent } from "./_components/cart-content";

export const metadata = {
  title: "Carrinho - ZeeExpress",
  description: "Revise os itens do seu carrinho",
};

export default function CartPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50">
        <CartContent />
      </main>
      <Footer />
    </div>
  );
}
