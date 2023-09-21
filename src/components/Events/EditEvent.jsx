import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchEvent, updateEvent, queryClient } from '../../util/http.js';

import Modal from '../UI/Modal.jsx';
import EventForm from './EventForm.jsx';
import LoadingIndicator from '../UI/LoadingIndicator';
import ErrorBlock from '../UI/ErrorBlock.jsx';

export default function EditEvent() {
  const navigate = useNavigate();
  const params = useParams();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['events', params.id],
    queryFn: ({ signal }) => fetchEvent({ signal, id: params.id }),
  });

  const { mutate } = useMutation({
    mutationFn: updateEvent,
    // onMutate und mutate werden gleichzeitig aufgerufen, d.h. wen mutate aufgerufen wird, wird sofort onMutate aufgerufen
    // hier werden die Daten aktualisiert, bei bei React Query gecacht wurden
    // data sind die Daten, die mutate übergeben wurden
    onMutate: async (data) => {
      const newEvent = data.event;
      // alle Queries mit dem speziellen queryKey canceln, um Konflikte zu vermeiden und nur neue Daten zu erhalten
      // es werden nur Queries gecancelt, die mit useQuery ausgeführt wurden
      // 1. alte Queries löschen
      await queryClient.cancelQueries({ queryKey: ['events', params.id] });

      // 2. die alten Daten zwischenspeichern für ein mögliches Rollback (s.u.)
      const previousEvent = queryClient.getQueryData(['events', params.id]);
      // 3. die eigenen Daten in die UI setzen
      queryClient.setQueryData(['events', params.id], newEvent);

      return { previousEvent: previousEvent };
    },

    // Rollback - d.h. die Daten in der UI wieder löschen und auf den vorherigen Zustand zurücksetzen - falls es zu einem Server-Error kommt
    onError: (error, data, context) => {
      queryClient.setQueryData(['events', params.id], context.previousEvent);
    },
    // onSettled wird immer ausgeführt, wenn die Mutation durchgeführt wurde, egal ob erfolgreich oder mit Fehlern
    onSettled: () => {
      // dadurch werden alle Queries invalide gesetzt und ein Refetching erwirkt, was zu einer Synchronisierung von
      // Frontend und Backend führt und man im Frontend immer die aktuellsten Daten hat
      queryClient.invalidateQueries(['events', params.id]);
    },
  });

  function handleSubmit(formData) {
    mutate({ id: params.id, event: formData });
    navigate('../');
  }

  function handleClose() {
    navigate('../');
  }

  let content;

  if (isPending) {
    content = (
      <div className="center">
        <LoadingIndicator />
      </div>
    );
  }

  if (isError) {
    content = (
      <>
        <ErrorBlock
          title="Failed to load event"
          message={
            error.info?.message ||
            'Failed to load event. Please check your inputs and try again later'
          }
        />
        <div className="form-actions">
          <Link to="../" className="button">
            Okay
          </Link>
        </div>
      </>
    );
  }

  if (data) {
    content = (
      <EventForm inputData={data} onSubmit={handleSubmit}>
        <Link to="../" className="button-text">
          Cancel
        </Link>
        <button type="submit" className="button">
          Update
        </button>
      </EventForm>
    );
  }

  return <Modal onClose={handleClose}>{content}</Modal>;
}
