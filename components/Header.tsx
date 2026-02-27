import { Text, View } from "react-native";
import { useAuthStore } from "../store/auth.store";

export default function Header() {
  const userName = useAuthStore((s) => s.user);

  return (
    <View style={{backgroundColor:"white"}}>
      <Text style={{color:"black"}}>Welcome back</Text>
      <Text style={{color:"black"}}>{userName}</Text>
    </View>
  );
}
