import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import About from "@/components/About";
import Procedures from "@/components/Procedures";
import Technology from "@/components/Technology";
import Testimonials from "@/components/Testimonials";
import Appointment from "@/components/Appointment";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Marquee />
        <About />
        <Procedures />
        <Technology />
        <Testimonials />
        <Appointment />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
