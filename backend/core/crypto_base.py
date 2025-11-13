from abc import ABC, abstractmethod
from typing import Tuple

class Signer(ABC):
    @abstractmethod
    def generate_keypair(self) -> Tuple[bytes, bytes]: ...
    @abstractmethod
    def sign(self, sk: bytes, msg: bytes) -> bytes: ...
    @abstractmethod
    def verify(self, pk: bytes, msg: bytes, sig: bytes) -> bool: ...
