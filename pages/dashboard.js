import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getUser, signOut } from "../lib/auth";
import { Button, Typography, Container } from "@mui/material";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    getUser().then((user) => {
      if (!user) router.push("/auth"); // Redirect to login if not authenticated
      setUser(user);
    }).catch(() => router.push("/auth"));
  }, []);

  if (!user) return <p>Loading...</p>;

  return (
    <Container maxWidth="xs">
      <Typography variant="h5">Welcome, {user.email}</Typography>
      <Button variant="contained" color="secondary" fullWidth onClick={signOut}>
        Sign Out
      </Button>
    </Container>
  );
}
