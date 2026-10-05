from collections import defaultdict, deque


class SessionMemory:
    """Small bounded in-process conversation memory for the demo deployment."""

    def __init__(self, turns_per_session: int = 8, max_sessions: int = 500) -> None:
        self._turns_per_session = turns_per_session
        self._max_sessions = max_sessions
        self._sessions: dict[str, deque[tuple[str, str]]] = defaultdict(
            lambda: deque(maxlen=self._turns_per_session)
        )

    def context(self, session_id: str) -> str:
        turns = self._sessions.get(session_id, ())
        return "\n".join(f"User: {user}\nAssistant: {assistant}" for user, assistant in turns)

    def add_turn(self, session_id: str, user: str, assistant: str) -> None:
        if session_id not in self._sessions and len(self._sessions) >= self._max_sessions:
            self._sessions.pop(next(iter(self._sessions)))
        self._sessions[session_id].append((user[:4000], assistant[:4000]))


session_memory = SessionMemory()
