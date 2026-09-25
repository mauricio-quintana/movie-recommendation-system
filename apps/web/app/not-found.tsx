import Link from 'next/link';
import { StateMessage } from '@/components/states';

export default function NotFound() {
  return (
    <StateMessage
      title="No encontramos esta página"
      description="Puede que no exista o que no tengas acceso a ella."
    >
      <Link href="/movies" className="btn-primary px-[18px] py-2.5">
        Descubrir películas
      </Link>
    </StateMessage>
  );
}
