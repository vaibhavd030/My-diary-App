import asyncio
from sqlalchemy import select
from my_diary.db.session import SessionLocal
from my_diary.db.models import User

async def promote():
    email = "vaibhav030@gmail.com"
    async with SessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            user.is_admin = True
            await session.commit()
            print(f"SUCCESS: {email} is now an admin.")
        else:
            print(f"ERROR: User {email} not found.")

if __name__ == "__main__":
    asyncio.run(promote())
