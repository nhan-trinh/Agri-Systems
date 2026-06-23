import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { ListUsersQueryDto, UpdateStatusDto } from './user.dto';
import responseHelper from '../../shared/utils/response.helper';

export class UserController {
  // GET /users — paginated list, RBAC-scoped in the service.
  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = ListUsersQueryDto.parse(req.query);
      const result = await userService.listUsers(query, req.user!);
      responseHelper.paginate(res, result.data, result.meta);
    } catch (error) {
      next(error);
    }
  };

  // GET /users/:id
  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await userService.getUserById(req.params.id, req.user!);
      responseHelper.success(res, user);
    } catch (error) {
      next(error);
    }
  };

  // POST /users/managers — returns the temporary password once.
  public createManager = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await userService.createManager(req.body);
      responseHelper.success(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  // PATCH /users/:id/status
  public setStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { is_active } = UpdateStatusDto.parse(req.body);
      const user = await userService.setUserStatus(req.params.id, is_active, req.user!);
      responseHelper.success(res, user);
    } catch (error) {
      next(error);
    }
  };

  // POST /users/:id/reset-password — returns the new temporary password once.
  public resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await userService.resetPassword(req.params.id, req.user!);
      responseHelper.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}

export const userController = new UserController();
