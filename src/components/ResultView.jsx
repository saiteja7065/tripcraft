import EmptyState from './EmptyState.jsx'
import ErrorState from './ErrorState.jsx'
import Itinerary from './Itinerary.jsx'
import LoadingState from './LoadingState.jsx'

// Decides which screen to show. Order matters: an in-flight request or an
// error wins over the current trip, but the trip isn't thrown away - after an
// error the user can go straight back to it.
export default function ResultView({ request, trip, onRetry, onEditRequest, online, ...itineraryProps }) {
  if (request.status === 'loading') {
    return <LoadingState stage={request.stage} startedAt={request.startedAt} onCancel={request.cancel} />
  }

  if (request.status === 'error') {
    return (
      <ErrorState
        error={request.error}
        online={online}
        onRetry={onRetry}
        onEdit={onEditRequest}
        onBack={trip ? request.reset : null}
      />
    )
  }

  if (trip) return <Itinerary trip={trip} online={online} {...itineraryProps} />

  return <EmptyState />
}
