import { useRouter } from 'expo-router';
import { CommonActions } from 'expo-router/react-navigation';
import { Tabs } from 'expo-router/js-tabs';
import { BottomNavigation, Icon } from 'react-native-paper';

const TAB_ICONS: Record<string, [focused: string, unfocused: string]> = {
  index: ['home', 'home-outline'],
  alertas: ['alert-circle', 'alert-circle-outline'],
  'mis-sitios': ['star', 'star-outline'],
  nueva: ['share-variant', 'share-variant-outline'],
};

export default function TabLayout() {
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ navigation, state, descriptors, insets }) => (
        <BottomNavigation.Bar
          navigationState={state}
          safeAreaInsets={insets}
          onTabPress={({ route, preventDefault }) => {
            // "Compartir" no es una pantalla de las pestañas: abre el editor como modal.
            if (route.name === 'nueva') {
              preventDefault();
              router.push('/compartir');
              return;
            }
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (event.defaultPrevented) {
              preventDefault();
            } else {
              navigation.dispatch({
                ...CommonActions.navigate(route.name, route.params),
                target: state.key,
              });
            }
          }}
          renderIcon={({ route, focused, color }) => {
            const [on, off] = TAB_ICONS[route.name] ?? ['circle', 'circle-outline'];
            return <Icon source={focused ? on : off} size={24} color={color} />;
          }}
          getLabelText={({ route }) => descriptors[route.key].options.title ?? route.name}
          getBadge={({ route }) => descriptors[route.key].options.tabBarBadge}
        />
      )}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="alertas" options={{ title: 'Alertas' }} />
      <Tabs.Screen name="mis-sitios" options={{ title: 'Mis sitios' }} />
      <Tabs.Screen name="nueva" options={{ title: 'Compartir' }} />
    </Tabs>
  );
}
