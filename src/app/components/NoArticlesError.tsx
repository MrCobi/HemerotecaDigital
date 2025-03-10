import React from "react";
import Image from "next/image";

interface NoArticlesErrorProps {
  message: string;
  imagePath: string;
}

const NoArticlesError: React.FC<NoArticlesErrorProps> = ({ message, imagePath }) => {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-white-100">
      <Image src={imagePath} alt="No articles found" width={200} height={200} />
      <h1 className="text-2xl font-bold text-red-600 mt-10">{message}</h1>
    </div>
  );
};

export default NoArticlesError;