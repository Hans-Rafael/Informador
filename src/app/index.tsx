import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export default function HomeScreen() {
  // Simulamos los datos del MVP según tu Card Sorting (Pág. 26)
  const alertasCercanas = [
    { id: 1, categoria: 'Seguridad', titulo: 'Corte de calle por protesta', tiempo: 'Hace 5 min', barrio: 'Palermo', icono: '⚠️' },
    { id: 2, categoria: 'Cultura', titulo: 'Feria artesanal en la plaza', tiempo: 'Hoy 16:00', barrio: 'Palermo', icono: '🎨' },
  ];

  return (
    <View className="flex-1 bg-slate-950">
      
      {/* 1. HEADER SUPERIOR (Tono neutral y personalizado - Pág. 9) */}
      <View className="pt-14 pb-4 px-4 bg-slate-900 border-b border-slate-800">
        <Text className="text-2xl font-black text-emerald-400 tracking-tight">InfoBarrio</Text>
        <Text className="text-xs text-slate-400">Hola Sofía, enterate qué pasa a la vuelta de la esquina</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* 2. CONTENEDOR DEL MAPA (Prioridad Alta MVP - Pág. 25, 34) */}
        {/* Agregamos bordes punteados simulando el wireframe mientras integrás el mapa real */}
        <View className="m-4 h-64 bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden items-center justify-center">
          <View className="absolute inset-0 bg-emerald-500/5 items-center justify-center">
            <Text className="text-4xl mb-2">📍</Text>
            <Text className="text-slate-400 font-medium">Mapa de Geolocalización</Text>
            <Text className="text-xs text-slate-500 mt-1">Visualizando radio: 500m</Text>
          </View>
        </View>

        {/* 3. SECCIÓN "EN ESTA ZONA" (Fiel a tu Wireframe - Pág. 34) */}
        <View className="px-4 flex-row justify-between items-center mb-3">
          <Text className="text-lg font-bold text-slate-200">En esta zona</Text>
          <View className="bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <Text className="text-xs font-bold text-emerald-400">2 Alertas activas</Text>
          </View>
        </View>

        {/* 4. LISTA DE ALERTAS / NOVEDADES (Card Sorting - Pág. 26) */}
        <View className="px-4 pb-24">
          {alertasCercanas.map((alerta) => (
            <TouchableOpacity 
              key={alerta.id} 
              className="bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-800 flex-row items-center"
              activeOpacity={0.7}
            >
              <View className="w-12 h-12 bg-slate-800 rounded-xl items-center justify-center mr-4">
                <Text className="text-xl">{alerta.icono}</Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Text className="text-xs font-bold text-emerald-400 uppercase tracking-wider mr-2">{alerta.categoria}</Text>
                  <Text className="text-xs text-slate-500">• {alerta.tiempo}</Text>
                </View>
                <Text className="text-sm font-semibold text-slate-200" numberOfLines={1}>{alerta.titulo}</Text>
                <Text className="text-xs text-slate-400 mt-0.5">{alerta.barrio}</Text>
              </View>
              <Text className="text-slate-500 text-lg font-bold ml-2">›</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      {/* 5. MENÚ INFERIOR / ACCIÓN DE COMPARTIR (Funcionalidad Imprescindible - Pág. 24) */}
      <View className="absolute bottom-0 inset-x-0 bg-slate-900/95 border-t border-slate-800 pt-3 pb-6 px-6 flex-row justify-between items-center">
        <TouchableOpacity className="items-center opacity-100">
          <Text className="text-xl">🏠</Text>
          <Text className="text-[10px] text-emerald-400 font-bold mt-1">Inicio</Text>
        </TouchableOpacity>
        
        {/* Botón flotante central para "Compartir mi Noticia" (Prioridad 1 en tu MVP) */}
        <TouchableOpacity 
          className="bg-emerald-500 px-5 py-3 rounded-full flex-row items-center shadow-lg shadow-emerald-500/20 -mt-8"
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-sm">✍️ Reportar</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center opacity-50">
          <Text className="text-xl">👤</Text>
          <Text className="text-[10px] text-slate-400 mt-1">Mi Perfil</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}
