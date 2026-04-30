interface RouteHeaderProps {
  title: string
  intent: string
}

export function RouteHeader({ title, intent }: RouteHeaderProps) {
  return (
    <div>
      <h1>{title}</h1>
      <p>{intent}</p>
    </div>
  )
}
