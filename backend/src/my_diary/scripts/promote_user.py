"""Utility script to promote a user to Admin status.

Usage:
    uv run python src/my_diary/scripts/promote_user.py <email>
"""

import sys
import asyncio
from sqlalchemy import select, update
from my_diary.db.session import SessionLocal
from my_diary.db.models import User

async def promote(email: str):
    async with SessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"❌ User with email '{email}' not found.")
            return

        await session.execute(
            update(User).where(User.id == user.id).values(is_admin=True)
        )
        await session.commit()
        print(f"✅ User '{email}' has been promoted to Admin.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python promote_user.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    asyncio.run(promote(email))
