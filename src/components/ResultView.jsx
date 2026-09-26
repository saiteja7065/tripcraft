import EmptyState from './EmptyState.jsx'
import ErrorState from './ErrorState.jsx'
import Itinerary from './Itinerary.jsx'
import LoadingState from './LoadingState.jsx'

// Chooses the screen to render. A pending request or an error takes precedence
// over the current trip, which is kept so the user can return to it.
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
