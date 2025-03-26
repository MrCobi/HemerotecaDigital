import * as React from "react";
import Image from "next/image";

function Loading() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-white-100">
      <Image
        src="/gif/loading.gif" // Asegúrate de que la ruta sea correcta
        alt="Loading"
        width={16}
        height={16}
        unoptimized={true}
        priority={true}
        className="w-16 h-16" // Puedes aplicar las clases de Tailwind aquí
      />
    </div>
  );
}

export default Loading;
