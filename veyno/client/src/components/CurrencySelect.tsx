// client/src/components/CurrencySelect.tsx
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { useCurrency } from "@/context/CurrencyContext";
import { FlagUS, FlagEU, FlagHU } from "@/icons/icons";

function CurrIcon({ curr }: { curr: string }) {
  if (curr === "USD") return <FlagUS className="h-4 w-4 shrink-0" />;
  if (curr === "EUR") return <FlagEU className="h-4 w-4 shrink-0" />;
  return <FlagHU className="h-4 w-4 shrink-0" />;
}

export default function CurrencySelect() {
  const { currency, setCurrency } = useCurrency();

  return (
    <Select value={currency} onValueChange={setCurrency}>
      <SelectTrigger
        className="
          footer-currency-trigger
          w-[95px] bg-transparent border-none shadow-none
          hover:bg-transparent focus:ring-0 focus:outline-none
          data-[state=open]:bg-transparent px-1 text-white
          flex items-center justify-center gap-[6px] leading-none
        "
      >
        <CurrIcon curr={currency} />
        <span className="text-sm font-medium">{currency}</span>
      </SelectTrigger>

      <SelectContent className="footer-currency-content min-w-[95px]">
        {["USD", "EUR", "HUF"].map((val) => (
          <SelectItem key={val} value={val}>
            <div className="flex items-center justify-center gap-[6px] h-6 leading-none">
              <CurrIcon curr={val} />
              <span className="text-sm font-medium">{val}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
