"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/app/components/ui/tabs";
import { Card } from "@/src/app/components/ui/card";

export function DashboardTabs({ _userId }: { _userId: string }) {
  return (
    <Tabs defaultValue="sources" className="w-full">
      <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
        <TabsTrigger value="sources">Fuentes</TabsTrigger>
        <TabsTrigger value="comments">Comentarios</TabsTrigger>
        <TabsTrigger value="ratings">Valoraciones</TabsTrigger>
        <TabsTrigger value="followers">Seguidores</TabsTrigger>
      </TabsList>
      <TabsContent value="sources">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Todas las Fuentes</h3>
          {/* Implementar lista de fuentes */}
        </Card>
      </TabsContent>
      <TabsContent value="comments">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Mis Comentarios</h3>
          {/* Implementar lista de comentarios */}
        </Card>
      </TabsContent>
      <TabsContent value="ratings">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Mis Valoraciones</h3>
          {/* Implementar lista de valoraciones */}
        </Card>
      </TabsContent>
      <TabsContent value="followers">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Seguidores y Siguiendo</h3>
          {/* Implementar lista de seguidores */}
        </Card>
      </TabsContent>
    </Tabs>
  );
}