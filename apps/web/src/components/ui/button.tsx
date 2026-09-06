import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // `max-w-full` + quebra de palavra: o rótulo longo ("Ver Todos os Protocolos")
  // com tracking largo media 350px e furava a viewport de 360px, criando scroll
  // horizontal na página inteira. Sem `whitespace-nowrap` o texto acomoda.
  "inline-flex max-w-full items-center justify-center gap-2 break-words text-center text-[0.8125rem] sm:text-sm font-medium tracking-[0.1em] sm:tracking-[0.2em] uppercase ring-offset-background transition-all duration-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-[hsl(var(--espresso))]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent/10 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline normal-case tracking-normal",
        hero:
          "bg-[hsl(var(--cream))] text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground hover:border-primary",
        cta:
          "bg-primary text-primary-foreground hover:bg-[hsl(var(--espresso))] border border-primary",
        ghostLight:
          "border border-[hsl(var(--cream))]/40 text-[hsl(var(--cream))] hover:bg-[hsl(var(--cream))] hover:text-primary backdrop-blur-sm",
      },
      // Altura e respiro horizontal crescem com a tela: o padding fixo do
      // desktop era o que estourava a largura no celular. `min-h` garante o
      // alvo de toque de 44px recomendado mesmo quando a altura encolhe.
      size: {
        default: "min-h-11 h-auto px-5 py-3 sm:px-7",
        sm: "min-h-10 h-auto px-4 py-2 text-xs sm:px-5",
        lg: "min-h-12 h-auto px-6 py-3.5 sm:min-h-14 sm:px-10",
        icon: "h-11 w-11 shrink-0 sm:h-10 sm:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
