import TabBar from "@/components/TabBar";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main style={{ paddingBottom: 88 }}>{children}</main>
      <TabBar />
    </>
  );
}
